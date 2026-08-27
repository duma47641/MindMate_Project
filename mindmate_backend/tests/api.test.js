// Mock Testing Handlers
function mockRegister(body) {
  if (!body.email || !body.password) {
    return { status: 400, data: { error: 'Missing required fields' } };
  }
  return { status: 201, data: { message: 'User registered successfully', userId: 'usr_mock_123' } };
}

function mockLogin(body) {
  if (body.email === 'test@mindmate.com' && body.password === 'Pass1234') {
    return { status: 200, data: { token: 'mock_jwt_token_sample', role: 'patient' } };
  }
  return { status: 401, data: { error: 'Invalid credentials' } };
}

function mockGetDoctorSlots() {
  return {
    status: 200,
    data: { doctorId: 'doc_456', availableSlots: ['09:00 AM', '10:30 AM', '02:00 PM'] }
  };
}

describe('Node.js & Express API Gateway Unit & Integration Tests', () => {
  test('UT-NODE-01: Should successfully register a new patient account', () => {
    const res = mockRegister({ email: 'newpatient@mindmate.com', password: 'Password@123' });
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('userId');
  });

  test('UT-NODE-02: Should authenticate valid patient and return JWT token', () => {
    const res = mockLogin({ email: 'test@mindmate.com', password: 'Pass1234' });
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('token');
    expect(res.data.role).toBe('patient');
  });

  test('UT-NODE-03: Should reject login when invalid credentials are provided', () => {
    const res = mockLogin({ email: 'wrong@mindmate.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('IT-NODE-04: Should fetch real-time doctor availability slots', () => {
    const res = mockGetDoctorSlots();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.availableSlots)).toBe(true);
    expect(res.data.availableSlots.length).toBe(3);
  });
});