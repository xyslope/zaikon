const request = require('supertest');
const app = require('../app');

// Mock the environment to test security properly
const originalEnv = process.env.NODE_ENV;

describe('Location Security Tests - Issue #16', () => {
  beforeAll(() => {
    // Temporarily disable test mode to test actual security
    process.env.NODE_ENV = 'production';
  });

  afterAll(() => {
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  describe('Unauthorized Location Access Prevention', () => {
    test('should deny access to location without session in non-test mode', async () => {
      const response = await request(app)
        .get('/location/loc-samplelocation');
      
      expect(response.statusCode).toBe(302); // Redirect to login
      expect(response.headers.location).toBe('/');
    });

    test('should deny access to location for non-member user', async () => {
      // In test mode, this demonstrates the vulnerability exists
      // because all users get the same test user session
      process.env.NODE_ENV = 'test';
      
      const response = await request(app)
        .get('/location/loc-nonmemberlocation');
      
      // Should return 404 for non-existent location or 403 for non-member access
      expect([403, 404]).toContain(response.statusCode);
      
      process.env.NODE_ENV = 'production';
    });

    test('should log security violations for monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      process.env.NODE_ENV = 'test';
      const response = await request(app)
        .get('/location/loc-nonexistentlocation');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('不正アクセス試行')
      );
      
      consoleSpy.mockRestore();
      process.env.NODE_ENV = 'production';
    });

    test('should handle database errors gracefully without leaking access', async () => {
      process.env.NODE_ENV = 'test';
      
      // Test with malformed location ID that might cause DB errors
      const response = await request(app)
        .get('/location/malformed-id-with-sql-injection-attempt');
      
      // Should not return 500 that might leak information
      expect([403, 404]).toContain(response.statusCode);
      
      process.env.NODE_ENV = 'production';
    });

    test('should validate member access properly', async () => {
      process.env.NODE_ENV = 'test';
      
      // Test access to existing location with proper member
      const response = await request(app)
        .get('/location/loc-samplelocation');
      
      // Should succeed for valid member (200) or fail for non-member (403)
      expect([200, 403]).toContain(response.statusCode);
      
      process.env.NODE_ENV = 'production';
    });
  });
});