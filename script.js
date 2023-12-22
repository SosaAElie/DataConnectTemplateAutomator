/**
 * @typedef {Object} Well - creates a new type named 'Well'
 * @property {Number} well - The number of the well according the 384 well plate
 * @property {String} wellPosition - The well position i.e A1, B2, C3, etc
 * @property {String} sampleName - a number property of SpecialType
 * @property {String} sampleColor - a number property of SpecialType
 * @property {String} biogroupName - a number property of SpecialType
 * @property {String} biogroupColor - a number property of SpecialType
 * @property {String} targetName - a number property of SpecialType
 * @property {String} targetColor - a number property of SpecialType
 * @property {String} task - an optional number property of SpecialType
 * @property {String} reporter - an optional number property of SpecialType
 * @property {String} quencher - an optional number property of SpecialType with default
 * @property {String} quantity - an optional number property of SpecialType with default
 * @property {String} comments - an optional number property of SpecialType with default
 * @property {Number} well96Number - an optional number property of SpecialType with default
 * @property {String} well96Position - an optional number property of SpecialType with default
 * @property {Array<String>} well384Positions - an optional number property of SpecialType with default
 * @property {Array<String>} targets - an optional number property of SpecialType with default
 * @property {Array<String>} reporters - an optional number property of SpecialType with default
 * @property {Array<Number>} wellNumbers 
 * @property {Function} get384WellArray - an optional number property of SpecialType with default
 */


function main(){
    const fileSubmitForm = document.getElementById("select-files");
    fileSubmitForm.addEventListener("submit", event =>{
        event.preventDefault();
        const fileInput = event.target[0].files[0];
        parseTemplateFile(fileInput).then(parsedCsv=>{
            const template = get96WellTemplate(parsedCsv);
            const wells = convertToWells(template);
            mutateTriplets(wells[0])
            console.log(wells[0].get384WellArray())
        })
    })
}
/** 
*  @param {File} file
*  @returns {Promise<String>}
**/
function parseTemplateFile(file){
    return new Promise((resolve, reject)=>{
        Papa.parse(file, {complete:resolve})
    })
}
/** 
*  @param {Object} results
*  @param {File} file
*  @returns {Promise}
**/
function get96WellTemplate(results, file){
    const {data, errors, meta} = results;
    return data.slice(2,10).map(innerArray=>innerArray.slice(1));
}


/** 
 *  @param {Number} well
 *  @param {String} sampleName
 *  @param {String} position96Well
 *  @param {Object} targetsAndReporters
 *  @returns {Well}
**/
function wellFactory(well, sampleName, position96Well, targetsAndReporters){
    const targets = Object.keys(targetsAndReporters).map(x=>x);
    const reporters = Object.values(targetsAndReporters).map(x=>x);
    return {
        "well":0,
        "wellPosition":"",
        "sampleName":sampleName,
        "sampleColor":"",
        "biogroupName":"",
        "biogroupColor":"",
        "targetName":"",
        "targetColor":"",
        "task":"",
        "reporter":"",
        "quencher":"",
        "quantity":"",
        "comments":"",
        "well96Number":well,
        "well96Position":position96Well,
        "well384Positions":[],
        "targets":targets,
        "reporters":reporters,
        "wellNumbers":[],
        get384WellArray(){
            const data = [];
            for(let j = 0; j < this["well384Positions"].length; j++){
                this["wellPosition"] = this["well384Positions"][j];
                for(let i = 0; i < this.targets.length;i++){
                    const values = Object.values(this).slice(0,13);
                    values[0] = this.wellNumbers[j];
                    values[6] = this.targets[i];
                    values[9] = this.reporters[i];
                    data.push(values);
                }
            }
            return data;
        }
    }
}

/** 
 *  @param {Array<Array<String>>} template
 *  @returns {Array<Well>}
**/
function convertToWells(template){
    let wellNumber = 0;
    const wells = [];
    const wellColumn = 65; //Ascii value for 'A'
    for(let row = 0; row < template.length;row++){
        for(let column = 0; column < template[row].length;column++){
            let wellPosition = String.fromCharCode(wellColumn+row);
            wells.push(wellFactory(++wellNumber,template[row][column], `${wellPosition}${column+1}`, {CT:"RP"}))
        }
    }
    return wells;
}

/** 
 *  @param {Well} well
 *  @returns {void}
**/
function mutateTriplets(well){
    //Pushes to the 384WellPositions property the corresponding well positions for triplicates in the 384 well template
    const rowLetter = well.well96Position[0];
    const columnNumber = Number(well.well96Position.slice(1));
    const letters = [];
    const numbers = [];
    const A = 65; //Ascii value of 'A'
    const rowAscii = rowLetter.charCodeAt(0)
    const offset = rowAscii-A;
    const initial384Row = String.fromCharCode(rowAscii+offset);
    const end384Row = String.fromCharCode(rowAscii+offset+1);
    
    const endCol = columnNumber*2;
    const startCol = endCol-1;
    
    letters.push(initial384Row, initial384Row, end384Row);
    numbers.push(startCol, endCol, startCol);
    
    for(let i = 0; i < letters.length; i++){
        well.well384Positions.push(`${letters[i]}${numbers[i]}`);
        well.wellNumbers.push(((letters[i].charCodeAt(0)-A)*24)+numbers[i]); //The well number at 384 well plate
    }

    return;
}


main()