'use strict';
const db = require('../lib/arangodb');
const aql = require('arangojs').aql;
const Joi = require('joi');
const {
  nameSchema
} = require('../lib/schemas');
const CustomError = require('../lib/custom-error');

class Person {
  constructor(person) {
    this._key = person._key;
    this._id = person._id;
    this.name = person.name;
    this.surname = person.surname;
    this.midname = person.midname;
    this.maidenName = person.maidenName;
    this.info = person.info;
    this.rod = person.rod;
    this.gender = person.gender;
    this.born = person.born;
    this.died = person.died;
    this.addedBy = person.addedBy;
    this.pic = person.pic;
  }

  static get schema() {
    return Joi.object().keys({
      _key: Joi.string().trim().regex(/^[a-zA-Z0-9]+$/).min(3).max(30).allow(null),
      name: nameSchema.required(),
      surname: nameSchema.empty('').allow(null),
      midname: nameSchema.empty('').allow(null),
      maidenName: nameSchema.empty('').allow(null),
      info: Joi.string().trim().min(1).max(3000).empty('').allow(null),
      rod: Joi.string().max(100).allow(null), // allow('') is same: empty('').default('')
      gender: Joi.number().integer().min(0).max(1).required(),
      born: Joi.number().integer().min(0).max(2020).empty('').allow(null),
      died: Joi.number().integer().min(0).max(2020).empty('').allow(null),
    });
  }

  static async create(personData, addedBy) {
    // todo: доделать валидацию
    const validPerson = Joi.attempt(personData, Person.schema);
    validPerson.created = new Date(); // todo: rename to createdAt
    validPerson.addedBy = addedBy;
    const persons = db.collection('Persons');
    const person = await persons.save(validPerson);
    return new Person(person);
  }

  static async get(handle) {
    const persons = db.collection('Persons');
    const person = await persons.document(handle);
    if (!person) {
      throw (new CustomError(404, ': person not found'));
    }
    return new Person(person);
  }

  static async createChildEdge(edgeData, fromId, toId) {
    const Child = db.edgeCollection('child');
    edgeData.created = new Date(); // todo: rename to addedAt
    await Child.save(edgeData, fromId, toId);
  }

  static async delete(person_key) {
    /* правильное удаление Person (вершины графа удалять вместе со связями) */
    const childGraph = db.graph('childGraph');
    const vertexCollection = childGraph.vertexCollection('Persons');
    await vertexCollection.remove(person_key);
  }

  async findClosestUsers() {
    // найти ближайших родственников-юзеров (у которых длина пути равна ближайшему элементу, согласно bfs)
    // todo: сделать в одном запросе
    // todo: продумать процедуру умирания пользователя
    // todo: запретить приглашение родственника с разницей в возрасте более 2-х поколений во избежание мертвых душ
    const depth = await db.query(
        aql `FOR v, e, p
          IN 0..100 ANY ${this._id}
          GRAPH 'childGraph'
          OPTIONS {bfs: true, uniqueVertices: 'global'}
          FILTER v.user.status == 1
          FILTER p.edges[*].del ALL == null
          LIMIT 1
        RETURN LENGTH(p.edges)`)
      .then(cursor => cursor.next());

    if (!depth) {
      return [];
    }
    const closestRelativesUsers = await db.query(
        aql `FOR v, e, p
          IN ${depth} ANY ${this._id}
          GRAPH "childGraph"
          OPTIONS {bfs: true, uniqueVertices: 'global'}
          FILTER v.user.status == 1
          FILTER p.edges[*].del ALL == null
        RETURN {_id: v._id, name: v.name, surname: v.surname}`) // depth: LENGTH(p.edges)
      .then(cursor => cursor.all());

    return closestRelativesUsers
  }

  // todo: cover by tests
  async checkPermission(user, options = {}) {
    if (options.manager) {
      if (user.hasRoles(['manager'])) return true
    }
    let closestUsers = await this.findClosestUsers(); // юзеры, которые могут изменять person
    if (closestUsers.some(item => item._id === user._id)) return true; // если user является ближайшим родственником-юзером
    return false
  }

  async fetchProfile() {
    // todo: get addedBy by DOCUMENT command with only some fields
    // TODO: refactor shortest path (common ancs, relationship)
    const profile = await db.query(aql `
	  FOR p IN Persons
	      FILTER p._id == ${this._id}
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
          }
        )`).then(cursor => cursor.next());

    if (profile === undefined) {
      throw (new CustomError(404, ': profile not found'));
    }
    return profile
  }

  async fetchTree() {
    return await db.query(
      aql `RETURN {
            predki:
              (FOR v, e, p IN 1..100 INBOUND ${this._id} GRAPH 'childGraph'
                // OPTIONS {bfs: true}
                FILTER p.edges[*].del ALL == null            // не учитывать удаленные связи
                RETURN {
                  person: {_key: v._key, _id: v._id, name: v.name, surname: v.surname, gender: v.gender, pic: v.pic},
                  edge: e,
                  // edges: p.edges
                  pathLength: LENGTH(p.edges)
                }),
            potomki:
              (FOR v, e, p IN 1..100 OUTBOUND ${this._id} GRAPH 'childGraph'
                OPTIONS {bfs: true, uniqueVertices: "global"} // uniqueVertices: "global" - остутствует один edge на каждый дубль
                FILTER p.edges[*].del ALL == null
                RETURN {
                  person: {_key: v._key, _id: v._id, name: v.name, surname: v.surname, gender: v.gender, pic: v.pic},
                  edge: e,
                  pathLength: LENGTH(p.edges)
                }),
            siblings: 
              (FOR v,e,p IN 2 ANY ${this._id} GRAPH 'childGraph'
                //OPTIONS {bfs: true, uniqueVertices: "global"}
                FILTER p.edges[0]._from == p.edges[1]._from AND p.edges[*].del ALL == null
                RETURN {
                  person: {_key: v._key, _id: v._id, name: v.name, surname: v.surname, gender: v.gender, pic: v.pic},
                  edge: e
                  //pathLength: LENGTH(p.edges)
                })
          }`).then(cursor => cursor.next());
  }

  async fetchPredkiPotomkiIdUnion() {
    return await db.query(
      aql `RETURN UNION(
              (FOR v, e, p IN 1..100 INBOUND ${this._id} GRAPH 'childGraph'       //predki id
                FILTER p.edges[*].del ALL == null
                RETURN v._id),
              (FOR v, e, p IN 1..100 OUTBOUND ${this._id} GRAPH 'childGraph'      //potomki id
                FILTER p.edges[*].del ALL == null
                RETURN v._id)
           )`).then(cursor => cursor.next());
  }

  async fetchNextOfKins() {
    return await db.query(
        aql `FOR v, e, p IN 1..1 ANY ${this._id} GRAPH 'childGraph'
              FILTER e.del == null
              RETURN {_key: v._key, _id: v._id, addedBy: v.addedBy}`)
      .then(cursor => cursor.all());
  }

  async getCommonAncestorKey(user_id) {
    // FILTER TO_BOOL(e.adopted) == false
    if (user_id === this._id) {
      return null;
    }
    return await db.query(aql `
    RETURN LAST(
      INTERSECTION(
        (FOR v, e, p IN 0..40 INBOUND ${user_id} 
          GRAPH 'childGraph'
          OPTIONS {bfs: true}
          FILTER TO_BOOL(e.del) == false
          RETURN v._key),
        (FOR v, e, p IN 0..40 INBOUND ${this._id}
          GRAPH 'childGraph'
          OPTIONS {bfs: true}
          FILTER TO_BOOL(e.del) == false
          RETURN v._key)
    ))`).then(cursor => cursor.next());
  }

  async getShortestPath(user_id) {
    return await db.query(aql `
	  FOR v, e IN ANY SHORTEST_PATH
      ${this._id} TO ${user_id}
      GRAPH 'childGraph'
      RETURN {
        person: {_key: v._key, _id: v._id, name: v.name, surname: v.surname, gender: v.gender, pic: v.pic},
        edge: e
      }`).then(cursor => cursor.all());
  }

  async getCommonAncestorPath(user_id, ancestor_id) {
    // FILTER TO_BOOL(e.adopted) == false
    return await db.query(aql `
	  FOR v, e, p IN 0..40 OUTBOUND ${ancestor_id} 
      GRAPH 'childGraph'
      FILTER TO_BOOL(e.del) == false
      FILTER v._id IN [${user_id}, ${this._id}]
      RETURN p`).then(cursor => cursor.all());
  }
}

module.exports = Person;
