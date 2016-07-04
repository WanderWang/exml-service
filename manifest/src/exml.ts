import * as scanner from './componentScanner';

export async function run(){
    
    var result = await scanner.run();
    console.log (result)
}


run();