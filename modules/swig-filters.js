'use strict';

let months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль',
				'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function getRusMonth(date){
	return months[date.getMonth()];
}

function ancestorRelation(a){	
	if (a.edges.length == 1) {
		if (a.person.gender == 1) return "отец";
		else if (a.person.gender == 0) return "мать";
	} else if (a.edges.length == 2) {
		if (a.person.gender == 1) return "дед";
		else if (a.person.gender == 0) return "бабушка";
	} else if (a.edges.length == 3) {
		if (a.person.gender == 1) return "прадед";
		else if (a.person.gender == 0) return "прабабушка";
	} else {
		return a.edges.length + "-е " + "колено";
	}
}

function descendantRelation(d){	
	if (d.edges.length == 1) {
		if (d.person.gender == 1) return "сын";
		else if (d.person.gender == 0) return "дочь";
	} else if (d.edges.length == 2) {
		if (d.person.gender == 1) return "внук";
		else if (d.person.gender == 0) return "внучка";
	} else if (d.edges.length == 3) {
		if (d.person.gender == 1) return "правнук";
		else if (d.person.gender == 0) return "правнучка";
	} else {
		return d.edges.length + "-е " + "колено";
	}
}

module.exports = {getRusMonth, ancestorRelation, descendantRelation};
