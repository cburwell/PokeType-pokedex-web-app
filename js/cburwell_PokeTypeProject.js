var PTApp = function() {
    // globals go here
    var pokedex;
    var pokemon;
    var typeArray = { };
    var type1;
    var type2;
    var weak = { };
    var resists = { };
    var immune = { };
    var typeEffectiveness = { };
    this.dlgButton = $('#dialogButton');
    this.searchButton = $('#searchButton');
    this.ddMenu = $('#dropDownMenu');
    this.pokemonArray = [ ];
}

PTApp.prototype.openDialog = function() {
    var self = this;

    $( "#dialogMessage" ).dialog({
        modal: true,
        width: 600,
        show: { effect: "blind", duration: 500 },
        buttons: [
            {text: "Ok", click: function() {
                self.search(true);
                $(this).dialog( "close" );
            }},
            {text: "Cancel", click: function() {$(this).dialog( "close" );}}
        ]
    });
}

PTApp.prototype.createDropDown = function() {
    var self = this;
    var $select = self.ddMenu;

    $.ajax({
        url: "http://pokeapi.co/api/v1/pokedex/1/",
        type: "GET",
        dataType: "jsonp",

        success: function(data, status, packet) {
            self.pokedex = data;
            console.log("Get successful for /api/v1/pokedex/1");

            $select.append('<option value="0" id="placeHold"></option>');
            self.pokemonArray.push('placeHold');
            
            // put all the pokemon in the dropdown
            for (ndx in self.pokedex.pokemon) {
                $select.append('<option value="' + (parseInt(ndx) + 1) + '">'
                 + self.pokedex.pokemon[ndx].name + '</option>');
                self.pokemonArray.push(self.pokedex.pokemon[ndx].name);
            }
           
            $('#dialogMessage').append($select);
        },

        error: function(packet, status) {
            // do error things
            console.log("There was an error processing this request");
        }
    });
}

PTApp.prototype.search = function(selected) {
    var self = this;
    var searched = $('#searchBar').val();

    if (selected)
        searched = self.pokemonArray[$('#dropDownMenu').val()];
    
    if (searched !== "placeHold") {
        var url ="http://pokeapi.co/api/v1/pokemon/" + String(parseInt(searched) ?
         parseInt(searched) : searched.toLowerCase());

        $.ajax({
            url: url,
            type: "GET",
            dataType: "jsonp",

            success: function(data, status, packet) {
                self.pokemon = data;
                console.log("Get successful for /api/v1/pokemon/" +
                 String(parseInt(searched) ? 
                 parseInt(searched) : searched.toLowerCase()));
                self.getSprite();
            },

            error: function(packet, status) {
                // Make this an alert or something fancy maybe
                console.log("Something went wrong, try inputting the id of the " +
                 "pokemon, or perhaps a hyphen with their gender (ex: nidoran-m)");
            }
        });
    }
}

PTApp.prototype.getSprite = function() {
    var self = this;

    $.ajax({
        url: "http://pokeapi.co/api/v1/sprite/" +
         String(self.pokemon.national_id + 1),
        type: "GET",
        dataType: "jsonp",

        success: function(data, status, packet) {
            self.pokemonSprite = data;
            console.log("Get successful for /api/v1/sprite/");
            self.displayResults();
        },

        error: function(packet, status) {
            console.log("Failed to retrieve sprite");
        }
    });
}

PTApp.prototype.displayResults = function() {
    var self = this;
    var type1;
    var type2;
    var abilities;
    
    // picture
    $('img#sprite').attr('src', "http://pokeapi.co/" + self.pokemonSprite.image);
    
    // types
    type1 = self.firstToUpper(self.pokemon.types[0].name);
    type2 = "None";

    if (self.pokemon.types[1])
        type2 = self.firstToUpper(self.pokemon.types[1].name);

    $('#typeSpan #type1').html(type1).attr('style', 'color: ' +
     this.typeArray[type1]);
    $('#typeSpan #type2').html(type2).attr('style', 'color: ' +
     this.typeArray[type2]);
    
    // name
    $('#speciesName').html(self.pokemon.name.toUpperCase());
    
    //abilities - maybe link
    abilities = "Abilities: ";
    for (ndx in self.pokemon.abilities)
        abilities += self.firstToUpper(self.pokemon.abilities[ndx].name)
          + ", ";
    abilities = abilities.substring(0, abilities.length - 2);

    $('#abilities').html(abilities);

    // do some srs string foolery for resists
    self.getType1();
}

PTApp.prototype.getType1 = function() {
    var self = this;
    var tempType1 = self.pokemon.types[0].resource_uri;
    var tempType2 = null;

    if (self.pokemon.types[1])
        tempType2 = self.pokemon.types[1].resource_uri;

    $.ajax({
        url: "http://pokeapi.co" + tempType1,
        type: "GET",
        dataType: 'jsonp',

        success: function(data, status, packet) {
            console.log("Get successful for " + tempType1);
            self.type1 = data;

            if (tempType2)
                self.getType2(tempType2);
            else
                self.displayResists();
        },

        error: function(data, stats) { 
            console.log("Error getting " + tempType1);
        }
    });
}

PTApp.prototype.getType2 = function(type) {
    var self = this;

    $.ajax({
        url: "http://pokeapi.co" + type,
        type: "GET",
        dataType: 'jsonp',

        success: function(data, status, packet) {
            console.log("Get successful for " + type);
            self.type2 = data;

            self.displayResists();
        },

        error: function(data, stats) { 
            console.log("Error getting " + this.type);
        }
    });
}

PTApp.prototype.displayResists = function() {
    var self = this;
    var lookupName;
    var typesUsed = { };
    var selector;
    var multiplier;

    self.clearResists();

    for (type in self.typeArray)
        typesUsed[type] = null;

    // effectiveness OF type ON lookupName
    for (type in typesUsed) {
        lookupName = self.firstToUpper(self.type1.name);
        multiplier = self.typeEffectiveness[type][lookupName];

        if (self.type2) {
            lookupName = self.firstToUpper(self.type2.name);
            multiplier *= self.typeEffectiveness[type][lookupName];
        }

        typesUsed[type] = multiplier;
    }

    for (type in typesUsed) {
        // weak
        if (typesUsed[type] > 1) {
            selector = '#weak';
        }
        // normal
        else if (typesUsed[type] === 1) {
            selector = '#normal';
        }
        // resists
        else if (typesUsed[type] < 1 && typesUsed[type] > 0) {
            selector = '#resists';
        }
        // immune
        else if (typesUsed[type] === 0) {
            selector = '#immune';
        }

        $(selector).append($('<li>' + type + ' (' + typesUsed[type] + 'x)</li>')
         .attr('style', 'color: ' + self.typeArray[type]));
    }
}

PTApp.prototype.clearResists = function() {
    $('#weak').empty();
    $('#normal').empty();
    $('#resists').empty();
    $('#immune').empty();
}

PTApp.prototype.firstToUpper = function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

PTApp.prototype.configure = function() {
    var self = this;
    
    this.dlgButton.button().click(function(e) {self.openDialog();});
    this.searchButton.button().click(function(e) {self.search(false);});
    this.createDropDown();
    this.ddMenu.menu();

    this.typeArray = {
        "Grass": "#BDDC76",
        "Water": "#63AAD4",
        "Normal": "#E5C7B4",
        "Fighting": "#8B675A",
        "Flying": "#0094BA",
        "Ground": "#B87F61",
        "Bug": "#00DD9A",
        "Ghost": "#622F7A",
        "Psychic": "#DB4D9A",
        "Ice": "#38959C",
        "Dragon": "#7481A1",
        "Dark": "#A7A7A6",
        "Fairy": "#E66FE2",
        "Fire": "#AD6F71",
        "Steel": "#8C8C8E",
        "Rock": "#E68000",
        "Poison": "#DB83FD",
        "Electric": "#FFFE00"
    };

    this.typeEffectiveness = {
        "Normal": {
            "Normal":   1.0,
            "Fighting": 1.0,
            "Flying":   1.0,
            "Poison":   1.0, 
            "Ground":   1.0,
            "Rock":     0.5,
            "Bug":      1.0,
            "Ghost":    0.0,
            "Steel":    0.5,
            "Fire":     1.0,
            "Water":    1.0,
            "Grass":    1.0,
            "Electric": 1.0,
            "Psychic":  1.0,
            "Ice":      1.0,
            "Dragon":   1.0,
            "Dark":     1.0,
            "Fairy":    1.0
        },

        "Fighting": {
            "Normal":   2.0,
            "Fighting": 1.0,
            "Flying":   0.5,
            "Poison":   0.5, 
            "Ground":   1.0,
            "Rock":     2.0,
            "Bug":      0.5,
            "Ghost":    0.0,
            "Steel":    2.0,
            "Fire":     1.0,
            "Water":    1.0,
            "Grass":    1.0,
            "Electric": 1.0,
            "Psychic":  0.5,
            "Ice":      2.0,
            "Dragon":   1.0,
            "Dark":     2.0,
            "Fairy":    0.5 
        },

        "Flying": {
            "Normal":   1.0,
            "Fighting": 2.0,
            "Flying":   1.0,
            "Poison":   1.0, 
            "Ground":   1.0,
            "Rock":     0.5,
            "Bug":      2.0,
            "Ghost":    1.0,
            "Steel":    0.5,
            "Fire":     1.0,
            "Water":    1.0,
            "Grass":    2.0,
            "Electric": 0.5,
            "Psychic":  1.0,
            "Ice":      1.0,
            "Dragon":   1.0,
            "Dark":     1.0,
            "Fairy":    1.0
        },

        "Poison": {
            "Normal":   1.0,
            "Fighting": 1.0,
            "Flying":   1.0,
            "Poison":   0.5, 
            "Ground":   0.5,
            "Rock":     0.5,
            "Bug":      1.0,
            "Ghost":    0.5,
            "Steel":    0.0,
            "Fire":     1.0,
            "Water":    1.0,
            "Grass":    2.0,
            "Electric": 1.0,
            "Psychic":  1.0,
            "Ice":      1.0,
            "Dragon":   1.0,
            "Dark":     1.0,
            "Fairy":    2.0
        },

        "Ground": {
            "Normal":   1.0,
            "Fighting": 1.0,
            "Flying":   0.0,
            "Poison":   2.0, 
            "Ground":   1.0,
            "Rock":     2.0,
            "Bug":      0.5,
            "Ghost":    1.0,
            "Steel":    2.0,
            "Fire":     2.0,
            "Water":    1.0,
            "Grass":    0.5,
            "Electric": 2.0,
            "Psychic":  1.0,
            "Ice":      1.0,
            "Dragon":   1.0,
            "Dark":     1.0,
            "Fairy":    1.0
        },

        "Rock": {
            "Normal":   1.0,
            "Fighting": 0.5,
            "Flying":   2.0,
            "Poison":   1.0, 
            "Ground":   0.5,
            "Rock":     1.0,
            "Bug":      2.0,
            "Ghost":    1.0,
            "Steel":    0.5,
            "Fire":     2.0,
            "Water":    1.0,
            "Grass":    1.0,
            "Electric": 1.0,
            "Psychic":  1.0,
            "Ice":      2.0,
            "Dragon":   1.0,
            "Dark":     1.0,
            "Fairy":    1.0
        },

        "Bug": {
            "Normal":   1.0,
            "Fighting": 0.5,
            "Flying":   0.5,
            "Poison":   0.5, 
            "Ground":   1.0,
            "Rock":     1.0,
            "Bug":      1.0,
            "Ghost":    0.5,
            "Steel":    0.5,
            "Fire":     0.5,
            "Water":    1.0,
            "Grass":    2.0,
            "Electric": 1.0,
            "Psychic":  2.0,
            "Ice":      1.0,
            "Dragon":   1.0,
            "Dark":     2.0,
            "Fairy":    0.5
        },

        "Ghost": {
            "Normal":   0.0,
            "Fighting": 1.0,
            "Flying":   1.0,
            "Poison":   1.0, 
            "Ground":   1.0,
            "Rock":     1.0,
            "Bug":      1.0,
            "Ghost":    2.0,
            "Steel":    1.0,
            "Fire":     1.0,
            "Water":    1.0,
            "Grass":    1.0,
            "Electric": 1.0,
            "Psychic":  2.0,
            "Ice":      1.0,
            "Dragon":   1.0,
            "Dark":     0.5,
            "Fairy":    1.0
        },

        "Steel": {
            "Normal":   1.0,
            "Fighting": 1.0,
            "Flying":   1.0,
            "Poison":   1.0, 
            "Ground":   1.0,
            "Rock":     2.0,
            "Bug":      1.0,
            "Ghost":    1.0,
            "Steel":    0.5,
            "Fire":     0.5,
            "Water":    0.5,
            "Grass":    1.0,
            "Electric": 0.5,
            "Psychic":  1.0,
            "Ice":      2.0,
            "Dragon":   1.0,
            "Dark":     1.0,
            "Fairy":    2.0
        },

        "Fire": {
            "Normal":   1.0,
            "Fighting": 1.0,
            "Flying":   1.0,
            "Poison":   1.0, 
            "Ground":   1.0,
            "Rock":     0.5,
            "Bug":      2.0,
            "Ghost":    1.0,
            "Steel":    2.0,
            "Fire":     0.5,
            "Water":    0.5,
            "Grass":    2.0,
            "Electric": 1.0,
            "Psychic":  1.0,
            "Ice":      2.0,
            "Dragon":   0.5,
            "Dark":     1.0,
            "Fairy":    1.0
        },

        "Water": {
            "Normal":   1.0,
            "Fighting": 1.0,
            "Flying":   1.0,
            "Poison":   1.0, 
            "Ground":   2.0,
            "Rock":     2.0,
            "Bug":      1.0,
            "Ghost":    1.0,
            "Steel":    1.0,
            "Fire":     2.0,
            "Water":    0.5,
            "Grass":    0.5,
            "Electric": 1.0,
            "Psychic":  1.0,
            "Ice":      1.0,
            "Dragon":   0.5,
            "Dark":     1.0,
            "Fairy":    1.0
        },

        "Grass": {
            "Normal":   1.0,
            "Fighting": 1.0,
            "Flying":   0.5,
            "Poison":   0.5, 
            "Ground":   2.0,
            "Rock":     2.0,
            "Bug":      0.5,
            "Ghost":    1.0,
            "Steel":    0.5,
            "Fire":     0.5,
            "Water":    2.0,
            "Grass":    0.5,
            "Electric": 1.0,
            "Psychic":  1.0,
            "Ice":      1.0,
            "Dragon":   0.5,
            "Dark":     1.0,
            "Fairy":    1.0
        },

        "Electric": {
            "Normal":   1.0,
            "Fighting": 1.0,
            "Flying":   2.0,
            "Poison":   1.0, 
            "Ground":   0.0,
            "Rock":     1.0,
            "Bug":      1.0,
            "Ghost":    1.0,
            "Steel":    1.0,
            "Fire":     1.0,
            "Water":    2.0,
            "Grass":    0.5,
            "Electric": 0.5,
            "Psychic":  1.0,
            "Ice":      1.0,
            "Dragon":   0.5,
            "Dark":     1.0,
            "Fairy":    1.0
        },

        "Psychic": {
            "Normal":   1.0,
            "Fighting": 2.0,
            "Flying":   1.0,
            "Poison":   2.0, 
            "Ground":   1.0,
            "Rock":     1.0,
            "Bug":      1.0,
            "Ghost":    1.0,
            "Steel":    0.5,
            "Fire":     1.0,
            "Water":    1.0,
            "Grass":    1.0,
            "Electric": 1.0,
            "Psychic":  0.5,
            "Ice":      1.0,
            "Dragon":   1.0,
            "Dark":     0.0,
            "Fairy":    1.0
        },

        "Ice": {
            "Normal":   1.0,
            "Fighting": 1.0,
            "Flying":   2.0,
            "Poison":   1.0, 
            "Ground":   2.0,
            "Rock":     1.0,
            "Bug":      1.0,
            "Ghost":    1.0,
            "Steel":    0.5,
            "Fire":     0.5,
            "Water":    0.5,
            "Grass":    2.0,
            "Electric": 1.0,
            "Psychic":  1.0,
            "Ice":      0.5,
            "Dragon":   2.0,
            "Dark":     1.0,
            "Fairy":    1.0
        },

        "Dragon": {
            "Normal":   1.0,
            "Fighting": 1.0,
            "Flying":   1.0,
            "Poison":   1.0, 
            "Ground":   1.0,
            "Rock":     1.0,
            "Bug":      1.0,
            "Ghost":    1.0,
            "Steel":    0.5,
            "Fire":     1.0,
            "Water":    1.0,
            "Grass":    1.0,
            "Electric": 1.0,
            "Psychic":  1.0,
            "Ice":      1.0,
            "Dragon":   2.0,
            "Dark":     1.0,
            "Fairy":    0.0
        },

        "Dark": {
            "Normal":   1.0,
            "Fighting": 0.5,
            "Flying":   1.0,
            "Poison":   1.0, 
            "Ground":   1.0,
            "Rock":     1.0,
            "Bug":      1.0,
            "Ghost":    2.0,
            "Steel":    1.0,
            "Fire":     1.0,
            "Water":    1.0,
            "Grass":    1.0,
            "Electric": 1.0,
            "Psychic":  2.0,
            "Ice":      1.0,
            "Dragon":   1.0,
            "Dark":     0.5,
            "Fairy":    0.5
        },

        "Fairy": {
            "Normal":   1.0,
            "Fighting": 2.0,
            "Flying":   1.0,
            "Poison":   0.5, 
            "Ground":   1.0,
            "Rock":     1.0,
            "Bug":      1.0,
            "Ghost":    1.0,
            "Steel":    0.5,
            "Fire":     0.5,
            "Water":    1.0,
            "Grass":    1.0,
            "Electric": 1.0,
            "Psychic":  1.0,
            "Ice":      1.0,
            "Dragon":   2.0,
            "Dark":     2.0,
            "Fairy":    1.0
        }
    }
}