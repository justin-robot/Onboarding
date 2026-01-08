import { http, HttpResponse } from "msw";

/**
 * MSW Request Handlers
 * 
 * Define your API mocks here. These handlers will intercept network requests
 * in your tests and return mocked responses.
 * 
 * Example:
 * export const handlers = [
 *   http.get('https://api.example.com/user', () => {
 *     return HttpResponse.json({
 *       id: 'abc-123',
 *       name: 'John Doe',
 *     })
 *   }),
 * ]
 * 
 * @see https://mswjs.io/docs/quick-start
 */
export const handlers = [
  // Add your request handlers here
];

