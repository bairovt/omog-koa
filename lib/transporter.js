const nodemailer = require('nodemailer');
const config = require('config')



const transporter = nodemailer.createTransport({
  // host: 'smtp.ethereal.email',
  // port: 587,
  // secure: false, // true for 465, false for other ports
  service: 'Yandex',
  auth: {
    user: 'mail@myrod.info',
    pass: config.get('mailer.pass')
  }
});

exports.default = transporter