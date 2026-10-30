const {chromium}=require('playwright');
const path=require('path');
const {pathToFileURL}=require('url');
const fs=require('fs');
(async()=>{const out=path.resolve(__dirname,'../generated');fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,args:['--no-sandbox','--allow-file-access-from-files']});try{const page=await browser.newPage();await page.goto(pathToFileURL(path.join(out,'cookbook_print.html')).href,{waitUntil:'networkidle'});await page.pdf({path:path.join(out,'cookbook.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
