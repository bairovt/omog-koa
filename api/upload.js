'use strict';
const db = require('lib/arangodb');
const config = require('config');
const promisify = require('util').promisify;
const fs = require('fs');
const path = require('path');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const multer = require('koa-multer');
const loGet = require('lodash').get;
const authorize = require('middleware/authorize');
const {fetchPerson, fetchPredkiPotomki, fetchPredkiPotomkiIdUnion, findCommonPredki, findClosestUsers} = require('lib/fetch-db'),
      {createChildEdge, createPerson, createUser, checkPermission} = require('lib/person');
const {personSchema, userSchema} = require('lib/schemas'),
      Joi = require('joi');

const router = new Router();

const fsStat = promisify(fs.stat),
      fsMkdir = promisify(fs.mkdir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, req.uploadDir)
  },
  filename: function (req, file, cb) {
    // console.log('file ' + JSON.stringify(file, null, 2))
    let filename = file.originalname;
    cb(null, file.fieldname + '_' + Date.now() + filename.slice(filename.lastIndexOf('.')))
  }
})
function fileFilter (req, file, cb) {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true)
  } else {
    const err = new Error('only .jpeg or .png images allowed');
    err.status = 400;
    cb(err, false)
  }
}
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 8
  }
});

async function prepare(ctx, next) {
  // todo: person_key verify, perms
  const {person_key} = ctx.params
  const uploadDir = path.join(config.get('vueDir'), 'static/upload', person_key)
  // console.log(uploadDir)
  let stats;
  try {
    stats = await fsStat(uploadDir)
  } catch(err) {
    if (err.code === 'ENOENT') {
      await fsMkdir(uploadDir)
    } else {
      ctx.throw(err)
    }
  }
  ctx.req.uploadDir = uploadDir
  await next()
}

async function uploadPic (ctx) { //POST
  // console.log(ctx.request.body)
  // console.log(ctx.request.body.file)
  const {person_key} = ctx.params
  const file = ctx.req.file;
  ctx.body = file;
}

router
  .post('/pic/:person_key', prepare, upload.single('pic'), uploadPic);

module.exports = router.routes();
