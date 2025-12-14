const faker = require('faker'); // Assuming faker is installed, or use built-in alternatives
const logger = require('../utils/logger');

// If faker not available, use simple generators
const generateName = () => faker ? faker.name.findName() : 'John Doe';
const generateEmail = () => faker ? faker.internet.email() : 'user@example.com';
const generateAge = () => faker ? faker.datatype.number({ min: 18, max: 80 }) : Math.floor(Math.random() * 63) + 18;
const generateCity = () => faker ? faker.address.city() : 'New York';
const generateDate = () => faker ? faker.date.past().toISOString().split('T')[0] : '2023-01-01';

/**
 * Generate synthetic user data
 * @param {number} count - Number of records to generate
 * @returns {Array} - Array of user objects
 */
function generateUserData(count = 100) {
    const users = [];
    for (let i = 0; i < count; i++) {
        users.push({
            id: i + 1,
            name: generateName(),
            email: generateEmail(),
            age: generateAge(),
            city: generateCity(),
            signup_date: generateDate(),
            is_active: Math.random() > 0.2 // 80% active
        });
    }
    return users;
}

/**
 * Generate synthetic product data
 * @param {number} count - Number of records to generate
 * @returns {Array} - Array of product objects
 */
function generateProductData(count = 50) {
    const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
    const products = [];
    for (let i = 0; i < count; i++) {
        products.push({
            id: i + 1,
            name: `Product ${i + 1}`,
            category: categories[Math.floor(Math.random() * categories.length)],
            price: Math.floor(Math.random() * 500) + 10,
            stock: Math.floor(Math.random() * 100),
            rating: (Math.random() * 4 + 1).toFixed(1)
        });
    }
    return products;
}

/**
 * Generate synthetic sales data
 * @param {number} count - Number of records to generate
 * @returns {Array} - Array of sales objects
 */
function generateSalesData(count = 200) {
    const sales = [];
    for (let i = 0; i < count; i++) {
        sales.push({
            id: i + 1,
            user_id: Math.floor(Math.random() * 100) + 1,
            product_id: Math.floor(Math.random() * 50) + 1,
            quantity: Math.floor(Math.random() * 5) + 1,
            total_amount: Math.floor(Math.random() * 500) + 10,
            sale_date: generateDate(),
            payment_method: ['Credit Card', 'PayPal', 'Cash'][Math.floor(Math.random() * 3)]
        });
    }
    return sales;
}

/**
 * Convert data array to CSV string
 * @param {Array} data - Array of objects
 * @returns {string} - CSV string
 */
function dataToCSV(data) {
    if (!data || !data.length) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

/**
 * Generate sample dataset based on type
 * @param {string} type - Type of data: 'users', 'products', 'sales'
 * @param {number} count - Number of records
 * @returns {string} - CSV string
 */
function generateSampleDataset(type, count = 100) {
    let data;
    switch (type) {
        case 'users':
            data = generateUserData(count);
            break;
        case 'products':
            data = generateProductData(count);
            break;
        case 'sales':
            data = generateSalesData(count);
            break;
        default:
            throw new Error('Unknown dataset type. Use: users, products, sales');
    }

    logger.info(`Generated ${count} ${type} records`);
    return dataToCSV(data);
}

module.exports = {
    generateUserData,
    generateProductData,
    generateSalesData,
    dataToCSV,
    generateSampleDataset
};