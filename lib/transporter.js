const nodemailer = require('nodemailer');
const config = require('config');

const transporter = nodemailer.createTransport({
  // service: 'Yandex',
  host: "webhost.dynadot.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: config.get("mailer.user"),
    pass: config.get("mailer.pass"),
  },
});

// function sendMail(mailOptions) {
module.exports = function(mailOptions) {
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error !== null) return reject(error);
      resolve(info);
    })
  })
}
