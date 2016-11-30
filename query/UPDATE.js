FOR p IN Persons
    FILTER p._key == 'SysykBairovaM'
    UPDATE p WITH {maidenName: 'Сампилова'} IN Persons RETURN NEW