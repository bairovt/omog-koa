'use strict';
const db = require('../lib/arangodb'),
      {findClosestUsers} = require('../lib/fetch-db');


async function createChildEdge(edgeData, fromId, toId) {
  const Child = db.edgeCollection('child');
  edgeData.created = new Date(); // todo: rename to createdAt
  await Child.save(edgeData, fromId, toId);
}

module.exports = {createChildEdge};
