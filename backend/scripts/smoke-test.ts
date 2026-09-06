import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:4000/api';

interface TestStepResult {
  step: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestStepResult[] = [];

function record(step: number, name: string, passed: boolean, details?: string) {
  results.push({ step, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [Step ${step}]: ${name}${details ? ` (${details})` : ''}`);
}

async function runSmokeTest() {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting DealFlow360 API Smoke Test against: ${BASE_URL}`);
  console.log(`======================================================\n`);

  try {
    // 0. Health check
    const health = await axios.get<any>(`${BASE_URL}/health`);
    if (health.data.status !== 'ok') {
      throw new Error('Health check failed');
    }

    // Step 1: Login as Sales Rep
    let repToken = '';
    try {
      const res = await axios.post<any>(`${BASE_URL}/auth/login`, {
        email: 'rep@dealflow360.com',
        password: 'password123',
      });
      repToken = res.data.token;
      record(1, 'Login as Sales Rep', !!repToken && res.data.user.role === 'SALES_REP');
    } catch (e: any) {
      record(1, 'Login as Sales Rep', false, e.response?.data?.error?.message || e.message);
      return;
    }

    const repAuthHeader = { headers: { Authorization: `Bearer ${repToken}` } };

    // Fetch Gold Customer and Hardware Product
    const productsRes = await axios.get<any>(`${BASE_URL}/products?category=HARDWARE`, repAuthHeader);
    const hardwareProduct = productsRes.data.find((p: any) => p.discountCeiling === 15) || productsRes.data[0];

    // Get sample quotation or customer
    const quotationsList = await axios.get<any>(`${BASE_URL}/quotations`, repAuthHeader);
    let customerId = '';
    let customerEmail = '';
    if (quotationsList.data.length > 0) {
      const sampleQ = await axios.get<any>(`${BASE_URL}/quotations/${quotationsList.data[0].id}`, repAuthHeader);
      customerId = sampleQ.data.customer.id;
      customerEmail = sampleQ.data.customer.email;
    }

    // Step 2: Create a new quotation with a discount above ceiling
    let createdQuotation: any = null;
    try {
      const res = await axios.post<any>(
        `${BASE_URL}/quotations`,
        {
          customerId,
          lines: [
            {
              productId: hardwareProduct.id,
              quantity: 2,
              discountPercent: 20, // 20% > ceiling of 15%
            },
          ],
        },
        repAuthHeader
      );
      createdQuotation = res.data;
      record(2, 'Create Quotation with discount above ceiling', res.status === 201);
    } catch (e: any) {
      record(2, 'Create Quotation with discount above ceiling', false, e.response?.data?.error?.message || e.message);
      return;
    }

    // Step 3: Confirm requiresManagerApproval = true and non-zero blendedRiskScore
    const riskCheck =
      createdQuotation.requiresManagerApproval === true && createdQuotation.blendedRiskScore > 0;
    record(
      3,
      'Confirm risk score and approval requirements',
      riskCheck,
      `Risk Score: ${createdQuotation.blendedRiskScore}%, Manager Req: ${createdQuotation.requiresManagerApproval}`
    );

    // Step 4: Submit it for approval
    let submittedQuotation: any = null;
    try {
      const res = await axios.post<any>(
        `${BASE_URL}/quotations/${createdQuotation.id}/submit-for-approval`,
        {},
        repAuthHeader
      );
      submittedQuotation = res.data;
      const stepPassed =
        submittedQuotation.status === 'PENDING_APPROVAL' && submittedQuotation.approvalSteps.length > 0;
      record(4, 'Submit Quotation for approval', stepPassed, `Status: ${submittedQuotation.status}`);
    } catch (e: any) {
      record(4, 'Submit Quotation for approval', false, e.response?.data?.error?.message || e.message);
      return;
    }

    // Step 5: Login as Sales Manager and approve pending step
    let managerToken = '';
    try {
      const mRes = await axios.post<any>(`${BASE_URL}/auth/login`, {
        email: 'manager@dealflow360.com',
        password: 'password123',
      });
      managerToken = mRes.data.token;
      const managerAuth = { headers: { Authorization: `Bearer ${managerToken}` } };

      const pendingStep = submittedQuotation.approvalSteps.find((s: any) => s.status === 'PENDING');
      const actionRes = await axios.post<any>(
        `${BASE_URL}/quotations/${createdQuotation.id}/approvals/${pendingStep.id}/action`,
        {
          action: 'APPROVE',
          reason: 'Approved for VIP customer',
        },
        managerAuth
      );
      record(5, 'Sales Manager approves pending step', actionRes.data.step.status === 'APPROVED');
    } catch (e: any) {
      record(5, 'Sales Manager approves pending step', false, e.response?.data?.error?.message || e.message);
      return;
    }

    // Step 6: Confirm quotation status becomes APPROVED
    try {
      const verifiedQ = await axios.get<any>(`${BASE_URL}/quotations/${createdQuotation.id}`, repAuthHeader);
      const isApproved = verifiedQ.data.status === 'APPROVED';
      record(6, 'Confirm quotation status is APPROVED', isApproved, `Current status: ${verifiedQ.data.status}`);
    } catch (e: any) {
      record(6, 'Confirm quotation status is APPROVED', false, e.response?.data?.error?.message || e.message);
    }

    // Step 7: Calculate and confirm warehouse fulfillment split
    try {
      await axios.post<any>(
        `${BASE_URL}/quotations/${createdQuotation.id}/fulfillment/calculate`,
        {},
        repAuthHeader
      );
      const confirmRes = await axios.post<any>(
        `${BASE_URL}/quotations/${createdQuotation.id}/fulfillment/confirm`,
        { useCalculated: true },
        repAuthHeader
      );
      const splitPassed = confirmRes.data.length > 0;
      record(
        7,
        'Calculate & confirm warehouse fulfillment split',
        splitPassed,
        `Allocated to ${confirmRes.data.length} warehouses`
      );
    } catch (e: any) {
      record(7, 'Calculate & confirm warehouse fulfillment split', false, e.response?.data?.error?.message || e.message);
    }

    // Step 8: Subscription billing schedule check
    try {
      const billRes = await axios.post<any>(
        `${BASE_URL}/quotations/${createdQuotation.id}/billing/generate-schedule`,
        {},
        repAuthHeader
      );
      record(
        8,
        'Subscription billing schedule generation',
        true,
        billRes.data.length === 0 ? 'No subscription line on this quotation (expected)' : `Generated ${billRes.data.length} schedules`
      );
    } catch (e: any) {
      record(8, 'Subscription billing schedule generation', false, e.response?.data?.error?.message || e.message);
    }

    // Step 9: Portal magic link, fetch, and counter-discount
    try {
      // Generate magic link for the quotation's actual customer
      const magicRes = await axios.post<any>(`${BASE_URL}/auth/portal-magic-link`, {
        email: customerEmail || createdQuotation?.customer?.email || 'deals@apexenterprises.com',
      });
      const portalToken = magicRes.data.magicLinkToken;
      const portalAuth = { headers: { Authorization: `Bearer ${portalToken}` } };

      // Fetch quotation via portal
      const portalQ = await axios.get<any>(`${BASE_URL}/portal/quotations/${createdQuotation.id}`, portalAuth);

      // Submit counter discount that pushes over ceiling
      const counterRes = await axios.post<any>(
        `${BASE_URL}/portal/quotations/${createdQuotation.id}/counter-discount`,
        {
          proposedDiscountPercent: 25,
          justification: 'Requested bulk purchase price match',
          lineId: portalQ.data.lines[0].id,
        },
        portalAuth
      );

      const reentered =
        counterRes.data.reenteredApproval === true && counterRes.data.quotationStatus === 'PENDING_APPROVAL';
      record(
        9,
        'Portal magic link & counter-discount re-entering approval',
        reentered,
        `Reentered: ${counterRes.data.reenteredApproval}, Status: ${counterRes.data.quotationStatus}`
      );
    } catch (e: any) {
      record(
        9,
        'Portal magic link & counter-discount re-entering approval',
        false,
        e.response?.data?.error?.message || e.message
      );
    }

    // Step 10: PASS/FAIL Summary
    console.log(`\n======================================================`);
    const allPassed = results.every((r) => r.passed);
    const passCount = results.filter((r) => r.passed).length;
    console.log(`📊 Smoke Test Summary: ${passCount} / ${results.length} PASSED`);
    console.log(`Overall Status: ${allPassed ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`);
    console.log(`======================================================\n`);
  } catch (err: any) {
    console.error('Unexpected error running smoke test:', err);
  }
}

runSmokeTest();
