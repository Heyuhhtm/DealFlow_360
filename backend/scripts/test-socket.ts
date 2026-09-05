import { io as Client } from 'socket.io-client';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import prisma from '../src/lib/prisma';

const SERVER_URL = 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'dealflow360-development-secret';

async function runSocketTests() {
  console.log('🧪 Starting Socket.io Real-Time Messaging Test Suite...\n');

  // Step 0: Find a test quotation and customers
  const quotation = await prisma.quotation.findFirst({
    include: {
      customer: true,
      rep: true,
    },
  });

  if (!quotation) {
    console.error('❌ No quotation found in database. Run seed first.');
    process.exit(1);
  }

  const quotationId = quotation.id;
  const repId = quotation.repId;
  const repEmail = quotation.rep?.email || 'rep@dealflow360.com';
  const repName = quotation.rep?.name || 'Sales Rep';
  const customerId = quotation.customerId;
  const customerEmail = quotation.customer.email;

  // Find another customer for cross-tenant isolation test
  const otherCustomer = await prisma.customer.findFirst({
    where: {
      id: { not: customerId },
    },
  });

  console.log(`📌 Using Test Quotation: ${quotationId}`);
  console.log(`📌 Quotation Customer: ${quotation.customer.name} (${customerId})`);
  if (otherCustomer) {
    console.log(`📌 Other Customer (for isolation test): ${otherCustomer.name} (${otherCustomer.id})`);
  }

  // Create JWT for internal user
  const internalToken = jwt.sign(
    {
      userId: repId,
      role: 'SALES_REP',
      email: repEmail,
      name: repName,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Create Portal token for the quotation's customer
  const validPortalToken = jwt.sign(
    {
      customerId,
      email: customerEmail,
      type: 'portal',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Create Portal token for a DIFFERENT customer (for security test)
  const invalidPortalToken = otherCustomer
    ? jwt.sign(
        {
          customerId: otherCustomer.id,
          email: otherCustomer.email,
          type: 'portal',
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      )
    : null;

  // ================= TEST 1: Unauthenticated Join Rejection =================
  console.log('\n--- TEST 1: Unauthenticated Join Rejection ---');
  await new Promise<void>((resolve, reject) => {
    const socket = Client(SERVER_URL, { reconnection: false });

    socket.on('connect', () => {
      console.log('Client connected. Attempting join without authentication...');
      socket.emit('join-quotation', { quotationId: quotationId });
    });

    socket.on('error', (err: any) => {
      console.log('✅ Received expected error:', err.message);
      socket.disconnect();
      resolve();
    });

    socket.on('joined-quotation', () => {
      socket.disconnect();
      reject(new Error('SECURITY FAILED: Unauthenticated socket joined quotation room!'));
    });

    setTimeout(() => {
      socket.disconnect();
      reject(new Error('Timeout waiting for error response in Test 1'));
    }, 4000);
  });

  // ================= TEST 2: Invalid Token Rejection =================
  console.log('\n--- TEST 2: Invalid Token Rejection ---');
  await new Promise<void>((resolve, reject) => {
    const socket = Client(SERVER_URL, { reconnection: false });

    socket.on('connect', () => {
      console.log('Attempting authenticate with bogus token...');
      socket.emit('authenticate', { token: 'bogus.invalid.jwt.token' });
    });

    socket.on('error', (err: any) => {
      console.log('✅ Received expected error on invalid token:', err.message);
      socket.disconnect();
      resolve();
    });

    socket.on('authenticated', () => {
      socket.disconnect();
      reject(new Error('SECURITY FAILED: Invalid token was accepted!'));
    });

    setTimeout(() => {
      socket.disconnect();
      reject(new Error('Timeout waiting for error response in Test 2'));
    }, 4000);
  });

  // ================= TEST 3: Cross-Customer Isolation Security =================
  if (invalidPortalToken) {
    console.log('\n--- TEST 3: Cross-Customer Isolation (Unauthorized Portal Access) ---');
    await new Promise<void>((resolve, reject) => {
      const socket = Client(SERVER_URL, { reconnection: false });

      socket.on('connect', () => {
        socket.emit('authenticate', { token: invalidPortalToken });
      });

      socket.on('authenticated', () => {
        console.log('Authenticated as different customer. Attempting to join target quotation...');
        socket.emit('join-quotation', { quotationId: quotationId });
      });

      socket.on('error', (err: any) => {
        console.log('✅ Received expected authorization error:', err.message);
        socket.disconnect();
        resolve();
      });

      socket.on('joined-quotation', () => {
        socket.disconnect();
        reject(new Error('SECURITY FAILED: Portal customer was able to join another customer quotation!'));
      });

      setTimeout(() => {
        socket.disconnect();
        reject(new Error('Timeout in Test 3'));
      }, 4000);
    });
  }

  // ================= TEST 4: Authorized Joining & Real-Time Push =================
  console.log('\n--- TEST 4: Real-Time Bidirectional Messaging ---');
  await new Promise<void>((resolve, reject) => {
    // Client A: Internal Sales Rep
    const repSocket = Client(SERVER_URL, { reconnection: false });
    // Client B: Customer Portal
    const customerSocket = Client(SERVER_URL, { reconnection: false });

    let repJoined = false;
    let customerJoined = false;
    let repReceivedMsg = false;
    let customerReceivedMsg = false;

    const checkDone = () => {
      if (repReceivedMsg && customerReceivedMsg) {
        console.log('✅ Both Sales Rep and Customer received the real-time message!');
        repSocket.disconnect();
        customerSocket.disconnect();
        resolve();
      }
    };

    repSocket.on('connect', () => {
      console.log('Sales Rep socket connected. Authenticating...');
      repSocket.emit('authenticate', { token: internalToken });
    });

    repSocket.on('authenticated', () => {
      console.log('Sales Rep authenticated. Joining quotation channel...');
      repSocket.emit('join-quotation', { quotationId: quotationId });
    });

    repSocket.on('joined-quotation', (res) => {
      console.log('✅ Sales Rep successfully joined room:', res.room);
      repJoined = true;
      if (customerJoined) triggerMessage();
    });

    customerSocket.on('connect', () => {
      console.log('Customer Portal socket connected. Authenticating...');
      customerSocket.emit('authenticate', { token: validPortalToken });
    });

    customerSocket.on('authenticated', () => {
      console.log('Customer Portal authenticated. Joining quotation channel...');
      customerSocket.emit('join-quotation', { quotationId: quotationId });
    });

    customerSocket.on('joined-quotation', (res) => {
      console.log('✅ Customer Portal successfully joined room:', res.room);
      customerJoined = true;
      if (repJoined) triggerMessage();
    });

    const testMessageText = `Automated negotiation ping ${Date.now()}`;

    function triggerMessage() {
      console.log('🚀 Sending message via customerSocket send-message event...');
      customerSocket.emit('send-message', {
        quotationId: quotationId,
        message: testMessageText,
      });
    }

    repSocket.on('new-message', (data) => {
      console.log('📩 Sales Rep received new-message:', data.author, '->', data.message);
      if (data.message === testMessageText) {
        repReceivedMsg = true;
        checkDone();
      }
    });

    customerSocket.on('new-message', (data) => {
      console.log('📩 Customer received new-message:', data.author, '->', data.message);
      if (data.message === testMessageText) {
        customerReceivedMsg = true;
        checkDone();
      }
    });

    setTimeout(() => {
      repSocket.disconnect();
      customerSocket.disconnect();
      if (!repReceivedMsg || !customerReceivedMsg) {
        reject(new Error(`Timeout waiting for real-time messages. Rep got: ${repReceivedMsg}, Customer got: ${customerReceivedMsg}`));
      }
    }, 6000);
  });

  // ================= TEST 5: REST POST /messages (Internal) pushes with authorType: INTERNAL =================
  console.log('\n--- TEST 5: REST POST /api/quotations/:id/messages pushes authorType: INTERNAL ---');
  await new Promise<void>((resolve, reject) => {
    const listenerSocket = Client(SERVER_URL, { reconnection: false });
    const internalMsgText = `Internal rep message ${Date.now()}`;

    listenerSocket.on('connect', () => {
      listenerSocket.emit('authenticate', { token: internalToken });
    });

    listenerSocket.on('authenticated', () => {
      listenerSocket.emit('join-quotation', { quotationId: quotationId });
    });

    listenerSocket.on('joined-quotation', async () => {
      console.log('Listener joined room. Calling POST /api/quotations/:id/messages...');
      try {
        await axios.post(
          `${SERVER_URL}/api/quotations/${quotationId}/messages`,
          { message: internalMsgText },
          { headers: { Authorization: `Bearer ${internalToken}` } }
        );
        console.log('REST POST /api/quotations/:id/messages returned 201.');
      } catch (err: any) {
        listenerSocket.disconnect();
        reject(err);
      }
    });

    listenerSocket.on('new-message', (data) => {
      if (data.message === internalMsgText) {
        console.log('✅ Received new-message with authorType:', data.authorType);
        if (data.authorType === 'INTERNAL' && data.quotationId === quotationId) {
          listenerSocket.disconnect();
          resolve();
        } else {
          listenerSocket.disconnect();
          reject(new Error(`authorType expected INTERNAL, got ${data.authorType}`));
        }
      }
    });

    setTimeout(() => {
      listenerSocket.disconnect();
      reject(new Error('Timeout waiting for internal message broadcast'));
    }, 6000);
  });

  // ================= TEST 6: REST POST /api/portal/quotations/:id/comments pushes authorType: CUSTOMER =================
  console.log('\n--- TEST 6: REST POST /api/portal/quotations/:id/comments pushes authorType: CUSTOMER ---');
  await new Promise<void>((resolve, reject) => {
    const listenerSocket = Client(SERVER_URL, { reconnection: false });
    const portalMsgText = `Customer negotiation note ${Date.now()}`;

    listenerSocket.on('connect', () => {
      listenerSocket.emit('authenticate', { token: validPortalToken });
    });

    listenerSocket.on('authenticated', () => {
      listenerSocket.emit('join-quotation', { quotationId: quotationId });
    });

    listenerSocket.on('joined-quotation', async () => {
      console.log('Customer listener joined room. Calling POST /api/portal/quotations/:id/comments...');
      try {
        await axios.post(
          `${SERVER_URL}/api/portal/quotations/${quotationId}/comments`,
          { message: portalMsgText },
          { headers: { Authorization: `Bearer ${validPortalToken}` } }
        );
        console.log('REST POST /api/portal/quotations/:id/comments returned 201.');
      } catch (err: any) {
        listenerSocket.disconnect();
        reject(err);
      }
    });

    listenerSocket.on('new-message', (data) => {
      if (data.message === portalMsgText) {
        console.log('✅ Received new-message with authorType:', data.authorType);
        if (data.authorType === 'CUSTOMER' && data.quotationId === quotationId) {
          listenerSocket.disconnect();
          resolve();
        } else {
          listenerSocket.disconnect();
          reject(new Error(`authorType expected CUSTOMER, got ${data.authorType}`));
        }
      }
    });

    setTimeout(() => {
      listenerSocket.disconnect();
      reject(new Error('Timeout waiting for customer message broadcast'));
    }, 6000);
  });

  // ================= TEST 7: POST /counter-discount emits counter-discount-proposed & quotation-status-changed =================
  console.log('\n--- TEST 7: POST /counter-discount emits counter-discount-proposed & quotation-status-changed ---');
  await new Promise<void>((resolve, reject) => {
    const listenerSocket = Client(SERVER_URL, { reconnection: false });
    let gotCounterEvent = false;
    let gotStatusEvent = false;

    const checkDone = () => {
      if (gotCounterEvent && gotStatusEvent) {
        console.log('✅ Both counter-discount-proposed AND quotation-status-changed received in real time!');
        listenerSocket.disconnect();
        resolve();
      }
    };

    listenerSocket.on('connect', () => {
      listenerSocket.emit('authenticate', { token: internalToken });
    });

    listenerSocket.on('authenticated', () => {
      listenerSocket.emit('join-quotation', { quotationId: quotationId });
    });

    listenerSocket.on('joined-quotation', async () => {
      console.log('Listener joined room. Calling POST /api/portal/quotations/:id/counter-discount...');
      try {
        await axios.post(
          `${SERVER_URL}/api/portal/quotations/${quotationId}/counter-discount`,
          {
            proposedDiscountPercent: 12,
            justification: 'Real-time WebSocket counter-discount integration test',
          },
          { headers: { Authorization: `Bearer ${validPortalToken}` } }
        );
        console.log('REST POST /counter-discount returned 200.');
      } catch (err: any) {
        listenerSocket.disconnect();
        reject(err);
      }
    });

    listenerSocket.on('counter-discount-proposed', (data) => {
      console.log('✅ Received counter-discount-proposed:', data);
      if (data.proposedDiscountPercent === 12 && data.justification) {
        gotCounterEvent = true;
        checkDone();
      }
    });

    listenerSocket.on('quotation-status-changed', (data) => {
      console.log('✅ Received quotation-status-changed:', data);
      if (data.quotationId === quotationId && data.newStatus) {
        gotStatusEvent = true;
        checkDone();
      }
    });

    setTimeout(() => {
      listenerSocket.disconnect();
      if (!gotCounterEvent || !gotStatusEvent) {
        reject(
          new Error(
            `Timeout in Test 7. CounterEvent: ${gotCounterEvent}, StatusEvent: ${gotStatusEvent}`
          )
        );
      }
    }, 7000);
  });

  console.log('\n🎉 ALL REAL-TIME EVENT BROADCAST TESTS PASSED WITH 100% SUCCESS!\n');
  process.exit(0);
}

runSocketTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
