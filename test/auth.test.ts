import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';

type MockResponse = {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
};

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

test('authenticateToken attaches the decoded user for valid bearer tokens', async () => {
  const { authenticateToken } = await import('../src/api/auth.js');
  const token = jwt.sign({ userId: 'u1', username: 'admin', isAdmin: true }, process.env.JWT_SECRET!);
  const req = { headers: { authorization: `Bearer ${token}` } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  authenticateToken(req, res as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, { userId: 'u1', username: 'admin', isAdmin: true, iat: req.user.iat });
});

test('authenticateToken rejects invalid bearer tokens', async () => {
  const { authenticateToken } = await import('../src/api/auth.js');
  const req = { headers: { authorization: 'Bearer invalid-token' } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  authenticateToken(req, res as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: 'Invalid or expired token' });
});

test('attachOptionalUser ignores invalid tokens and still calls next', async () => {
  const { attachOptionalUser } = await import('../src/api/auth.js');
  const req = { headers: { authorization: 'Bearer invalid-token' } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  attachOptionalUser(req, res as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user, undefined);
});
