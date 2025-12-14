const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/User');

describe('Auth Integration Tests', () => {
    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/queryjam_test');
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Clear users collection
        await User.deleteMany({});
    });

    describe('POST /auth/signup', () => {
        test('should create a new user', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/auth/signup')
                .send(userData)
                .expect(200);

            expect(response.headers['hx-redirect']).toBe('/dashboard');

            // Check user was created
            const user = await User.findOne({ email: userData.email });
            expect(user).toBeTruthy();
            expect(user.name).toBe(userData.name);
        });

        test('should reject duplicate email', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            };

            // Create first user
            await request(app).post('/auth/signup').send(userData);

            // Try to create duplicate
            const response = await request(app)
                .post('/auth/signup')
                .send(userData)
                .expect(400);

            expect(response.text).toContain('Email already registered');
        });
    });

    describe('POST /auth/login', () => {
        beforeEach(async () => {
            // Create a test user
            await User.create({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            });
        });

        test('should login with correct credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.headers['hx-redirect']).toBe('/dashboard');
        });

        test('should reject invalid credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            const response = await request(app)
                .post('/auth/login')
                .send(loginData)
                .expect(401);

            expect(response.text).toContain('Invalid email or password');
        });
    });
});