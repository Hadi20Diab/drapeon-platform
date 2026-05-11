import { ArgumentsHost, HttpStatus } from "@nestjs/common";

import { HttpExceptionFilter } from "./http-exception.filter";

describe("HttpExceptionFilter", () => {
  function createHost(response: { status: jest.Mock; json: jest.Mock }): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({
          method: "POST",
          url: "/api/auth/register"
        })
      })
    } as ArgumentsHost;
  }

  it("maps Prisma pool timeout errors to a readable 503 response", () => {
    const filter = new HttpExceptionFilter();
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    filter.catch(
      {
        name: "PrismaClientKnownRequestError",
        code: "P2024",
        message:
          "Timed out fetching a new connection from the connection pool. More info: http://pris.ly/d/connection-pool"
      },
      createHost(response)
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: expect.stringContaining("The database is busy right now")
      })
    );
  });
});
