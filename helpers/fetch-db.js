'use strict';
const db = require('modules/arangodb');
const aql = require('arangojs').aql;

async function getPerson(key) {
  let Persons = db.collection('Persons');
  return await Persons.document(key);
}

async function getAncestors(person_id){
  return await db.query(
      aql`FOR v, e, p
              IN 1..100 INBOUND
              ${person_id}
              GRAPH 'childGraph'
              OPTIONS {bfs: true}
              RETURN {person: v, edge: e, edges: p.edges}`)
      .then(cursor => cursor.all());
}

async function getDescendants(person_id){
  return await db.query(
      aql`FOR v, e, p
              IN 1..100 OUTBOUND
              ${person_id}
              GRAPH 'childGraph'
              OPTIONS {bfs: true}
              RETURN {person: v, edge: e, edges: p.edges}`)
      .then(cursor => cursor.all());
}

async function getAncsAndDescs(person_id){
  return await db.query(
      aql`RETURN {
            ancestors: 
              (FOR v, e, p
                IN 1..100 INBOUND
                ${person_id}
                GRAPH 'childGraph'
                OPTIONS {bfs: true}
                // RETURN {person: v, edge: e, edges: p.edges}),
                RETURN {
                 person: {_key: v._key, _id: v._id, name: v.name, surname: v.surname, gender: v.gender}, 
                  edge: e,
                  // edges: p.edges
                  pathLength: LENGTH(p.edges)
                }),
            descendants: 
              (FOR v, e, p
                IN 1..100 OUTBOUND
                ${person_id}
                GRAPH 'childGraph'
                OPTIONS {bfs: true}                
                RETURN {
                  person: {_key: v._key, _id: v._id, name: v.name, surname: v.surname, gender: v.gender},
                  edge: e,                  
                  pathLength: LENGTH(p.edges)
                })
          }`).then(cursor => cursor.next());
}

async function getAncsDescsIdUnion(person_id){
  return await db.query(
      aql`RETURN UNION(             
              (FOR v                //ancestors id
                IN 1..100 INBOUND
                ${person_id}
                GRAPH 'childGraph'
                RETURN v._id),             
              (FOR v                //descendants id
                IN 1..100 OUTBOUND
                ${person_id}
                GRAPH 'childGraph'                
                RETURN v._id)
           )`).then(cursor => cursor.next());

}

async function getCommonAncs(fromPerson_id, toPerson_id){
  return await db.query(
      aql`RETURN INTERSECTION(
              (FOR v                //ancestors id
                IN 1..100 INBOUND
                ${fromPerson_id}
                GRAPH 'childGraph'
                RETURN v._id),             
              (FOR v                //descendants id
                IN 1..100 INBOUND
                ${toPerson_id}
                GRAPH 'childGraph'                
                RETURN v._id)
           )`).then(cursor => cursor.next());

}

module.exports = {getPerson, getAncestors, getDescendants, getAncsAndDescs, getAncsDescsIdUnion, getCommonAncs};