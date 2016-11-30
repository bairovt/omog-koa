//Найти всех предков
FOR v, e, p
    IN 0..100 INBOUND
    "Persons/ZhigmitovAurA"
    GRAPH "parentGraph"
    OPTIONS {bfs: true}
    //FILTER p.edges.length
    //RETURN {name: v.fullname, path: p}
    RETURN {fullname: v.fullname, edges: p.edges}