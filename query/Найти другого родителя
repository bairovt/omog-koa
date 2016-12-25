// найти другого родителя
FOR v, e, p
    IN 1..1 INBOUND
    "Persons/BairovGonchikbalC"
    GRAPH "parentGraph"
    OPTIONS {}
    FILTER v._key != "DashidondokovBairD" 
    //RETURN {name: v.fullname, path: p}
    RETURN v.fullname