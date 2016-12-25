// все двоюродные
FOR v, e, p
    IN 1..1 INBOUND
    "Persons/BairovGonchikbalC"
    GRAPH "parentGraph"
    OPTIONS {}
    FILTER v._key != "DashidondokovBairD" // найти другого родителя
    //RETURN {name: v.fullname, path: p}
    RETURN v.fullname