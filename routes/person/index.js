'use strict';

// Person section
const db = require('modules/arangodb');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const authorize =require('middleware/authorize');

const router = new Router();

// Person page
function* getPerson(next) { 
    // let person = yield personsColl.document(this.params._key);   
    let _id = `Persons/${this.params._key}`;    

    // находим предков персоны
    let ancestorsCursor = yield db.query(
        // начинаем с 0 чтобы не делать еще 1 запрос для получения person
        aql`FOR v, e, p
            IN 0..100 INBOUND
            ${_id}
            GRAPH 'parentGraph'
            OPTIONS {bfs: true}
            RETURN {person: v, edges: p.edges}`
    );
    
    let ancestors = yield ancestorsCursor.all(); // ancestors[0] is person
    
    let person = ancestors[0].person; //извлекаем персону
    ancestors.splice(0, 1); // удалить персону из массива предков

    // находим потомков персоны
    let descendantsCursor = yield db.query(
        // начинаем с 0 чтобы не делать еще 1 запрос для получения person
        aql`FOR v, e, p
            IN 1..100 OUTBOUND
            ${_id}
            GRAPH 'parentGraph'
            OPTIONS {bfs: true}
            RETURN {person: v, edges: p.edges}`
    );

    let descendants = yield descendantsCursor.all()

    // // формируем объект массивов поколений: ключ - глубина колена, значение - массив предков этого колена
    // let gens = ancestors.reduce(function(gens, current, index) {
    //  if (index == 0) return gens; // игнорируем 0-й элемент (person)
    //  let i = current.edges.length; // глубина колена текущего предка
    //  if (typeof gens[i] === 'undefined') gens[i] = []; // инициируем массив предков i-го колена, если его нет
    //  gens[i].push(cursor.fullname); // добавляем предка в массив предков i-го колена
    //  return gens;
    // }, {}); // на входе пустой объект
    // let gensCount = Object.keys(gens).length;

    yield this.render("person", { person, ancestors, descendants }); //gens, gensCount
};

function* addPerson(next){
    if (this.method == "POST") {
        let relation = {
            father: 'отца',
            mother: 'мать',
            son: 'сына',
            daughter: 'дочь' 
        };
        let Persons = db.collection('Persons');
        // нужен транслитератор
        let doc ={

        }


    }
    yield this.render('add_person');
};

router
    // .use(authorize(['admin']))
    .get('/add_person/:rel/:_key', getPerson);    
    .all('/add_person', addPerson);
    

module.exports = router.routes();