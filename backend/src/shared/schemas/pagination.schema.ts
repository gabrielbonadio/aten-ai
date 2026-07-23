import Joi from 'joi';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../utils/pagination';

/** Query params de paginação reutilizáveis. */
export const paginationQuerySchema = {
  page: Joi.number().integer().min(1).default(DEFAULT_PAGE),
  pageSize: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE)
};
