const jsdom = require("jsdom");
const fs = require("fs");
const csv = require("fast-csv");
const path = require("path");

type Poem = {
    poet: string,
    poem: string,
    title: string
}

async function main(poet: string) {
    const poetPageHTML: string = await getPoetPageHTML(getPoetURL(poet));
    const links: HTMLCollection = await getPoemLinks(poetPageHTML);
    let poems: Poem[] = []

    for(let link of links) {

        if (!link.href.includes("/poems/") || link.href.includes("poetrymagazine")) {
            continue
        }

        const poem: Poem = await getPoem(link.href);
        if (poem.poem == undefined || poem.poem == "") {
            console.error("Error: Couldn't get poem: " + link)
            throw new Error();
        }

        console.log(poem)
        poems.push(poem)
    }

    saveToCSVFile(poems);
}

function saveToCSVFile(poems: Poem[]) {

    let rows: Array<string[]> = []
    poems.forEach(poem => {
        rows.push([poem.title, poem.poem, poem.poet]);
    })

    const data = {
        headers: ["title", "poem", "poet"],
        rows: rows
    }

    const csvFile = path.resolve(__dirname, getPoetURL(poems[0].poet)) + ".csv";
    
    // pass the array of headers to format() method
    const csvStream = csv.format({ headers: data.headers });

    // loop over nested row arrays
    const arr = data.rows;
    for (let i = 0; i<arr.length; i++) {
        let row = arr[i];
        csvStream.write( row );
    }
    csvStream.end();
    csvStream.pipe(fs.createWriteStream(csvFile, { encoding: 'utf8' } ))    
    return `Finished writing data to: ${csvFile}`;
}

async function getPoem(link: string) {
    const req = await fetch("https://www.poetryfoundation.org" + link)
    if (req.status != 200) {
        console.error("Error: Couldn't get poem: " + link)
        throw new Error();
    }

    const html = new jsdom.JSDOM(await req.text());
    
    // Gets the title
    const titleArrays = html.window.document.getElementsByClassName("type-gamma");
    if (titleArrays.length != 1) {
        console.log("Error: Couldn't get the title for poem: " + link)
        throw new Error();
    }
    let title = titleArrays[0].textContent;
    
    // Gets the poet
    const poetArray = html.window.document.getElementsByClassName("link-underline-off");
    if (poetArray.length != 1) {
        console.log("Error: Couldn't get the poet for poem: " + link)
        throw new Error();
    }
    let poet = poetArray[0].textContent;

    // Gets the poem
    const poemArray = html.window.document.getElementsByClassName("mb-6 flex flex-col gap-12 md:mb-0");
    if (poemArray.length != 1) {
        console.log("Error: Couldn't get the poem for poem named: " + title)
        throw new Error();
    }
    let poem = poemArray[0].textContent;

    return {
        poet: poet,
        poem: poem,
        title: title
    }
}

async function getPoemLinks(htmlString: string) {
    let html = new jsdom.JSDOM(htmlString);
    const poemLinks = html.window.document.getElementsByClassName("link-underline-on");

    if(poemLinks.length == 0) {
        console.error("Error: Couldn't get the poem links.")
        throw new Error();
    }

    return poemLinks;
}

async function getPoetPageHTML(poet: string) {
    const req = await fetch("https://www.poetryfoundation.org/poets/" + poet)
    if (req.status != 200) {
        console.error("Error: Couldn't find poet.")
        throw new Error();
    }

    const html = await req.text();
    return html
}


function getPoetURL(name: string): string {
    return name.toLowerCase().replace(" ", "-");
}

main("walt whitman")
// main("emily dickinson")
// main("robert frost")
// main("john keats")
