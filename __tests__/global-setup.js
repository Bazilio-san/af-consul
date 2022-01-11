require('dotenv').config();

module.exports = async () => {
  process.env.NODE_ENV = 'test';
};
