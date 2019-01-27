'use strict';
const aql = require('arangojs').aql;
const db = require('../lib/arangodb');
const CustomError = require('../lib/custom-error');

async function fetchPersonWithClosest(key) {
  const person_id = 'Persons/' + key;
  return await db.query(
      aql`FOR v, e, p IN 0..1 ANY ${person_id} GRAPH 'childGraph'
              FILTER e.del == null
              RETURN {_key: v._key, _id: v._id, addedBy: v.addedBy}`)
      .then(cursor => cursor.all());
}

async function fetchPredkiPotomkiIdUnion(person_id){
  return await db.query(
      aql`RETURN UNION(
              (FOR v, e, p IN 1..100 INBOUND ${person_id} GRAPH 'childGraph'       //predki id
                FILTER p.edges[*].del ALL == null
                RETURN v._id),
              (FOR v, e, p IN 1..100 OUTBOUND ${person_id} GRAPH 'childGraph'      //potomki id
                FILTER p.edges[*].del ALL == null
                RETURN v._id)
           )`).then(cursor => cursor.next());
}

async function findCommonPredki(fromPerson_id, toPerson_id){
  return await db.query(
      aql`RETURN INTERSECTION(
              (FOR v IN 1..100 INBOUND ${fromPerson_id} GRAPH 'childGraph'     //predki id
                RETURN v._id),
              (FOR v IN 1..100 INBOUND ${toPerson_id} GRAPH 'childGraph'       //potomki id
                RETURN v._id)
           )`).then(cursor => cursor.next());
}

module.exports = {fetchPredkiPotomkiIdUnion, findCommonPredki,
                  fetchPersonWithClosest};
