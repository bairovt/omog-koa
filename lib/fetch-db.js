'use strict';
const aql = require('arangojs').aql;
const db = require('../lib/arangodb');
const CustomError = require('../lib/custom-error');


async function fetchProfile(personId, userId=null) {
  // todo: get addedBy by DOCUMENT command with only some fields
  // TODO: refactor shortest path (common ancs, relationship)
  const profile = await db.query(aql`
	  FOR p IN Persons
	      FILTER p._id == ${personId}
	      RETURN MERGE({ _key: p._key, _id: p._id,
            name: p.name, surname: p.surname, midname: p.midname,
            gender: p.gender, maidenName: p.maidenName, born: p.born, died: p.died, pic: p.pic, info: p.info,
            quotes: p.quotes,
            user: p.user.status
          }, {
            rod: DOCUMENT(p.rod)
          }, {
            addedBy: FIRST(FOR added IN Persons
                        FILTER added._id == p.addedBy
                        RETURN {name: added.name, surname: added.surname, _key: added._key})
            // addedBy: DOCUMENT(p.addedBy)
          }
          , {
            shortest: (FOR v, e
                        IN ANY SHORTEST_PATH
                        ${personId} TO ${userId}
                        GRAPH 'childGraph'
                        RETURN {
                          person: {_key: v._key, _id: v._id, name: v.name, surname: v.surname, gender: v.gender, pic: v.pic},
                          edge: e
                        })
          }
        )`
  ).then(cursor => cursor.next());

  if (profile === undefined) throw(new CustomError(404, ': person/profile not found'));
  return profile
}

async function fetchPersonWithClosest(key) {
  const person_id = 'Persons/' + key;
  return await db.query(
      aql`FOR v, e, p IN 0..1 ANY ${person_id} GRAPH 'childGraph'
              FILTER e.del == null
              RETURN {_key: v._key, _id: v._id, addedBy: v.addedBy}`)
      .then(cursor => cursor.all());
}

async function fetchPredkiPotomki(person_id){
  return await db.query(
      aql`RETURN {
            predki:
              (FOR v, e, p IN 1..100 INBOUND ${person_id} GRAPH 'childGraph'
                // OPTIONS {bfs: true}
                FILTER p.edges[*].del ALL == null            // не учитывать удаленные связи
                RETURN {
                  person: {_key: v._key, _id: v._id, name: v.name, surname: v.surname, gender: v.gender, pic: v.pic},
                  edge: e,
                  // edges: p.edges
                  pathLength: LENGTH(p.edges)
                }),
            potomki:
              (FOR v, e, p IN 1..100 OUTBOUND ${person_id} GRAPH 'childGraph'
                OPTIONS {bfs: true, uniqueVertices: "global"} // uniqueVertices: "global" - остутствует один edge на каждый дубль
                FILTER p.edges[*].del ALL == null
                RETURN {
                  person: {_key: v._key, _id: v._id, name: v.name, surname: v.surname, gender: v.gender, pic: v.pic},
                  edge: e,
                  pathLength: LENGTH(p.edges)
                }),
            siblings: 
              (FOR v,e,p IN 2 ANY ${person_id} GRAPH 'childGraph'
                //OPTIONS {bfs: true, uniqueVertices: "global"}
                FILTER p.edges[0]._from == p.edges[1]._from AND p.edges[*].del ALL == null
                RETURN {
                  person: {_key: v._key, _id: v._id, name: v.name, surname: v.surname, gender: v.gender, pic: v.pic},
                  edge: e
                  //pathLength: LENGTH(p.edges)
                })
          }`).then(cursor => cursor.next());
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

async function findClosestUsers(person_id) {
  // найти ближайших родственников-юзеров (у которых длина пути равна ближайшему элементу, согласно bfs)
  // todo: сделать в одном запросе
  // todo: продумать процедуру умирания пользователя
  // todo: запретить приглашение родственника с разницей в возрасте более 2-х поколений во избежание мертвых душ
  const depth = await db.query(
    aql`FOR v, e, p
          IN 0..100 ANY ${person_id}
          GRAPH 'childGraph'
          OPTIONS {bfs: true, uniqueVertices: 'global'}
          FILTER v.user.status == 1
          FILTER p.edges[*].del ALL == null
          LIMIT 1
        RETURN LENGTH(p.edges)`)
    .then(cursor => cursor.next());

  const closestRelativesUsers = await db.query(
    aql`FOR v, e, p
          IN ${depth} ANY ${person_id}
          GRAPH "childGraph"
          OPTIONS {bfs: true, uniqueVertices: 'global'}
          FILTER v.user.status == 1
          FILTER p.edges[*].del ALL == null
        RETURN {_id: v._id, name: v.name, surname: v.surname}`) // depth: LENGTH(p.edges)
    .then(cursor => cursor.all());

  return closestRelativesUsers
}

module.exports = {fetchProfile, fetchPredkiPotomki,
                  fetchPredkiPotomkiIdUnion, findCommonPredki, findClosestUsers,
                  fetchPersonWithClosest};
