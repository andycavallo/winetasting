const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const glob = require("glob");

function ejs2html({ inPath, outPath, data, options }) {
  ejs.renderFile(inPath, data, options, (err, html) => {
    if (err) {
      console.log(err);
      return false;
    }
    fs.writeFile(outPath, html, (err) => {
      if (err) {
        console.log(err);
        return false;
      }
      return true;
    });
  });
}

glob(`${__dirname}/views/*.ejs`, {}, (err, files) => {
  if (err) {
    console.log(err);
    return;
  }
  files.forEach((file) => {
    const fileName = path.basename(file, '.ejs');
    ejs2html({
      inPath: file,
      outPath: `${__dirname}/public/${fileName}.html`
    });
  });
});