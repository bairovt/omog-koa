'use strict';
const db = require('lib/arangodb');
const aql = require('arangojs').aql;

async function getPerson(key) {
  let Persons = db.collection('Persons');
  return await Persons.document(key);
}

async function getAncestors(person_id){
  return await db.query(
      aql`FOR v, e, p IN 1..100 INBOUND ${person_id} GRAPH 'childGraph'
              OPTIONS {bfs: true}
              RETURN {person: v, edge: e, edges: p.edges}`)
      .then(cursor => cursor.all());
}

async function getDescendants(person_id){
  return await db.query(
      aql`FOR v, e, p IN 1..100 OUTBOUND ${person_id} GRAPH 'childGraph'
              OPTIONS {bfs: true}
              RETURN {person: v, edge: e, edges: p.edges}`)
      .then(cursor => cursor.all());
}

async function getAncsAndDescs(person_id){
  return await db.query(
      aql`RETURN {
            ancestors: 
              (FOR v, e, p IN 1..100 INBOUND ${person_id} GRAPH 'childGraph'
                OPTIONS {bfs: true}
                // RETURN {person: v, edge: e, edges: p.edges}),
                RETURN {
                 person: {_key: v._key, _id: v._id, name: v.name, surname: v.surname, gender: v.gender, image: v.image}, 
                  edge: e,
                  // edges: p.edges
                  pathLength: LENGTH(p.edges)
                }),
            descendants: 
              (FOR v, e, p IN 1..100 OUTBOUND ${person_id} GRAPH 'childGraph'
                OPTIONS {bfs: true}                
                RETURN {
                  person: {_key: v._key, _id: v._id, name: v.name, surname: v.surname, gender: v.gender, image: v.image},
                  edge: e,                  
                  pathLength: LENGTH(p.edges)
                })
          }`).then(cursor => cursor.next());
}

async function getAncsDescsIdUnion(person_id){
  return await db.query(
      aql`RETURN UNION(             
              (FOR v IN 1..100 INBOUND ${person_id} GRAPH 'childGraph'       //ancestors id
                RETURN v._id),             
              (FOR v IN 1..100 OUTBOUND ${person_id} GRAPH 'childGraph'      //descendants id
                RETURN v._id)
           )`).then(cursor => cursor.next());
}

async function getCommonAncs(fromPerson_id, toPerson_id){
  return await db.query(
      aql`RETURN INTERSECTION(
              (FOR v IN 1..100 INBOUND ${fromPerson_id} GRAPH 'childGraph'     //ancestors id                
                RETURN v._id),             
              (FOR v IN 1..100 INBOUND ${toPerson_id} GRAPH 'childGraph'       //descendants id
                RETURN v._id)
           )`).then(cursor => cursor.next());
}

async function findClosestUsers(fromId) {
  // найти всех родственников-пользователей
  let relUsers = await db.query(
      aql`FOR v, e, p
            IN 0..100 ANY
            ${fromId}
            GRAPH "childGraph"
            OPTIONS {uniqueVertices: 'global', bfs: true}
            FILTER v.user.status == 1
            RETURN {_id: v._id, name: v.name, surname: v.surname, pathLen: LENGTH(p.edges)}`)
      .then(cursor => cursor.all());
  // выбрать ближайших (у которых длина пути равна первому элементу, согласно bfs)
  return relUsers.filter((el, ind, arr) => {
    return el.pathLen === arr[0].pathLen;
  });
}

module.exports = {getPerson, getAncestors, getDescendants, getAncsAndDescs,
                  getAncsDescsIdUnion, getCommonAncs, findClosestUsers};