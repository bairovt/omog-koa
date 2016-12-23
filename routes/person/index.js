'use strict';

// Person section
const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
// const authorize =require('middleware/authorize');
const utils = require('utils')
const {nameProc, textProc, personKeyGen} = utils;

const router = new Router();

// Person page
function* getPerson(next) {    
    let key = this.params.key;    
    //извлечь персону с родом и добавившим
    let cursor = yield db.query(aql`
    FOR p IN Persons
        FILTER p._key == ${key}
        RETURN merge(p, { 
            rod: FIRST(FOR rod IN Rod            
                    FILTER p.rod == rod._id
                    RETURN {name: rod.name, key: rod._key}),
            addedBy: FIRST(FOR added IN Persons
                        FILTER added._id == p.addedBy
                        RETURN {name: added.name, key: added._key})
        })`
    );
    
    let person = yield cursor.next();    
    if (person === undefined) this.throw(404);    

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
    let {key, rel} = this.params;
    let person = yield Persons.document(key);
    if (this.method == "POST") {

        
        let childColl = db.edgeCollection('child');

        // todo: Валидация формы
        // проверка имени на спецсимволы!!! (разрешены только буквы и "-")
        // name обязательно, surname и midname - нет        
        let {surname, name, midname, lifestory} = this.request.body;
        surname = nameProc(surname);
        name = nameProc(name);
        midname = nameProc(midname);
        lifestory = textProc(lifestory);
        let fullname = `${surname} ${name} ${midname}`;
        let gender = 1;

        let created = new Date();
        let newPerson = {
            _key: yield personKeyGen(fullname),
            name, surname, midname, fullname, lifestory, gender, created,
            addedBy: this.session.user.id  //кем добавлен
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
            _to = 'Persons/' + key;
        } else if (rel == 'son' || rel == 'daughter' ) {
            _from = 'Persons/' + key;
            _to = 'Persons/' + newPerson._key;
        }        

        let childEdge = {            
            created,
            addedBy: this.session.user.id
        }
        yield Child.save(childEdge, _from, _to);

        this.redirect(`/person/${key}`);
    } // end POST
    // GET
    let relationDict = {father: 'отца', mother: 'мать', son: 'сына', daughter: 'дочь'};

    yield this.render('person/add_person', {person, rel, relation: relationDict[rel]});
}

function* removePerson(next) { // key
    const key = this.params.key;
    const childrenGraph = db.graph('childrenGraph');
    const graphCollection = childrenGraph.vertexCollection('Persons');
    yield graphCollection.remove(key); // todo: добавить обработку исключения неверного ключа
    this.redirect('/'); // todo: добавить сообщение об успешном удалении
}

// /person
router    
    .get('/:key', getPerson)    // страница человека
    //.use(authorize(['admin', 'manager']))
    .get('/:key/add/:rel', addPerson)   // страница добавления человека 
    .post('/:key/add/:rel', addPerson)    // обработка добавления человека
    .get('/:key/remove', removePerson);
    

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
