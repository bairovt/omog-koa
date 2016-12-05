'use strict';

// Person section
const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
// const authorize =require('middleware/authorize');
const utils = require('utils')
const {nameProc, personKeyGen} = utils;

const router = new Router();

// Person page
function* getPerson(next) { 
    let Persons = db.collection('Persons');
    let person = yield Persons.document(this.params._key);   
    // let _id = `Persons/${this.params._key}`;    

    // находим предков персоны
    let ancestorsCursor = yield db.query(
        // начинаем с 0 чтобы не делать еще 1 запрос для получения person
        aql`FOR v, e, p
            IN 1..100 INBOUND
            ${person._id}
            GRAPH 'childrenGraph'
            OPTIONS {bfs: true}
            RETURN {person: v, edges: p.edges}`
    );
    
    let ancestors = yield ancestorsCursor.all(); // if IN 0..100 INBOUND => ancestors[0] is person
    
    // let person = ancestors[0].person; //извлекаем персону
    // ancestors.splice(0, 1); // удалить персону из массива предков

    // находим потомков персоны
    let descendantsCursor = yield db.query(
        // начинаем с 0 чтобы не делать еще 1 запрос для получения person
        aql`FOR v, e, p
            IN 1..100 OUTBOUND
            ${person._id}
            GRAPH 'childrenGraph'
            OPTIONS {bfs: true}
            RETURN {person: v, edges: p.edges}`
    );

    let descendants = yield descendantsCursor.all()
    yield this.render("person/person", { person, ancestors, descendants }); //gens, gensCount
};

function* addPerson(next){ //rel, _key
    // rel: "father", "mother", "son", "daughter"
    // _key - ключ существующего person, к которому добавляем нового person
    let Persons = db.collection('Persons');
    let Child = db.edgeCollection('child');
    let {_key, rel} = this.params;
    let person = yield Persons.document(_key);
    if (this.method == "POST") {

        
        let childColl = db.edgeCollection('child');

        // todo: Валидация формы
        // проверка имени на спецсимволы!!! (разрешены только буквы и "-")
        // name обязательно, surname и midname - нет        
        let {surname, name, midname} = this.request.body;
        surname = nameProc(surname);
        name = nameProc(name);
        midname = nameProc(midname);        
        let fullname = `${surname} ${name} ${midname}`;
        let gender = 1;

        let created = new Date();
        let newPerson = {
            _key: yield personKeyGen(fullname),
            name, surname, midname, fullname, gender, created,
            addedBy: this.session._key  //кем добавлен
        };
        // если жен.
        if (rel == 'mother' || rel == 'daughter' ) {
            newPerson.gender = 0;                                //изменить пол на 0
            newPerson.maidenName = this.request.body.maidenName; //добавить девичью фамилию
        }        
        yield Persons.save(newPerson);
        // create parent edge        
        let _from, _to;
        if (rel == 'father' || rel == 'mother' ) {
            _from = 'Persons/' + newPerson._key;
            _to = 'Persons/' + _key;
        } else if (rel == 'son' || rel == 'daughter' ) {
            _from = 'Persons/' + _key;
            _to = 'Persons/' + newPerson._key;
        }        

        let childEdge = {            
            created,
            addedBy: this.session._key
        }
        yield Child.save(childEdge, _from, _to);

        this.redirect(`/person/${_key}`);
    } // end POST
    // GET
    let relationDict = {father: 'отца', mother: 'мать', son: 'сына', daughter: 'дочь'};

    yield this.render('person/add_person', {person, rel, relation: relationDict[rel]});
};

// /person
router    
    .get('/:_key', getPerson)    // страница человека
    //.use(authorize(['admin', 'manager']))
    .get('/:_key/add/:rel', addPerson)   // страница добавления человека 
    .post('/:_key/add/:rel', addPerson);    // обработка добавления человека
    

module.exports = router.routes();


    // // формируем объект массивов поколений: ключ - глубина колена, значение - массив предков этого колена
    // let gens = ancestors.reduce(function(gens, current, index) {
    //  if (index == 0) return gens; // игнорируем 0-й элемент (person)
    //  let i = current.edges.length; // глубина колена текущего предка
    //  if (typeof gens[i] === 'undefined') gens[i] = []; // инициируем массив предков i-го колена, если его нет
    //  gens[i].push(cursor.fullname); // добавляем предка в массив предков i-го колена
    //  return gens;
    // }, {}); // на входе пустой объект
    // let gensCount = Object.keys(gens).length;
