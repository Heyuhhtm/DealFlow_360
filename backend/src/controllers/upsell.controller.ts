import { Request, Response } from 'express';
import { getUpsellSuggestionsForQuotation } from '../services/upsell.service';

export const getUpsellSuggestions = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const suggestions = await getUpsellSuggestionsForQuotation(id);
  res.status(200).json(suggestions);
};
