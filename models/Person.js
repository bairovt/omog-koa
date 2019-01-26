'use strict';
const db = require('../lib/arangodb');
const aql = require('arangojs').aql;
const Joi = require('joi');
const {findClosestUsers} = require('../lib/fetch-db');
const {nameSchema} = require('../lib/schemas');
const CustomError = require('../lib/custom-error');

class Person {
	constructor(person){
		this._key = person._key;
		this._id = person._id;
		this.name = person.name;
		this.midname = person.midname;
		this.surname = person.surname;
		this.maidenName = person.maidenName;
		this.info = person.info;
		this.rod = person.rod;
		this.gender = person.gender;
		this.born = person.born;
		this.died = person.died;
		this.addedBy = person.addedBy;
		this.pic = person.pic;
	}

  static async create(personData, addedBy){
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
    const person =  await persons.document(handle);
    return new Person(person);
  }

  static async createChildEdge(edgeData, fromId, toId) {
    const Child = db.edgeCollection('child');
    edgeData.created = new Date(); // todo: rename to addedAt
    await Child.save(edgeData, fromId, toId);
  }

  async fetchProfile() {
    // todo: get addedBy by DOCUMENT command with only some fields
    // TODO: refactor shortest path (common ancs, relationship)
    const profile = await db.query(aql`
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
        )`
    ).then(cursor => cursor.next());

    if (profile === undefined) throw(new CustomError(404, ': person/profile not found'));
    return profile
  }

  async fetchTree() {
    return await db.query(
      aql`RETURN {
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

  async getShortest(user_id) {
    return await db.query(aql`
	  FOR v, e IN ANY SHORTEST_PATH
      ${this._id} TO ${user_id}
      GRAPH 'childGraph'
      RETURN {
        person: {_key: v._key, _id: v._id, name: v.name, surname: v.surname, gender: v.gender, pic: v.pic},
        edge: e
      }`
    ).then(cursor => cursor.all());
  }
}

Person.schema = Joi.object().keys({
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

module.exports = Person;
