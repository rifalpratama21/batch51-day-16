const express = require("express");
const path = require("path");
const app = express();
const PORT = 5000;
const dateDuration = require("./src/helper/duration");
const upload = require("./src/middlewares/uploadFile");

const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");

const config = require("./src/config/config.json");
const { Sequelize, QueryTypes } = require("sequelize");
const { log } = require("console");
const sequelize = new Sequelize(config.development);

// setup call hbs with sub folder
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "src/views"));

// set serving static file
app.use(express.static(path.join(__dirname, "src/assets")));
app.use(express.static("src/uploads"));

// parsing data from client
app.use(express.urlencoded({ extended: false }));

// setup flash
app.use(flash());

app.use(
  session({
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60 * 2,
    },
    store: new session.MemoryStore(),
    saveUninitialized: true,
    resave: false,
    secret: "secretValue",
  })
);

// routing
app.get("/", home);

app.get("/blog", blog);
app.post("/blog", upload.single("image"), addBlog);

app.get("/testimonial", testimonial);
app.get("/contact", contact);
app.get("/blog-detail/:id", blogDetail);
app.get("/form-blog", formBlog);

app.get("/delete-blog/:id", deleteBlog);
app.get("/edit-blog/:id", viewEditBlog);
app.post("/edit-blog/:id", upload.single("image"), updateBlog);

app.get("/register", formRegister);
app.post("/register", addUser);
app.get("/login", formLogin);
app.post("/login", userLogin);
app.get("/logout", userLogout);

app.use((req, res, next) => {
  res.status(404).send("<h1>Page not found on the server</h1>");
});

// local server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// index
async function home(req, res) {
  try {
    const query = `SELECT projects.id, tittle, content, "startDate", "endDate", technologies, images, users.name AS author FROM projects LEFT JOIN users ON projects.author = users.id ORDER BY projects.id DESC`;
    let obj = await sequelize.query(query, { type: QueryTypes.SELECT });
    let dataBlogRes = obj.map((item) => {
      return {
        ...item,
        duration: dateDuration(item.startDate, item.endDate),
        techs: viewIcon(item.technologies),
        isLogin: req.session.isLogin,
      };
    });
    console.log("render data home:", dataBlogRes);
    res.render("index", {
      dataBlog: dataBlogRes,
      isLogin: req.session.isLogin,
      user: req.session.user,
    });
  } catch (err) {
    console.log(err);
  }
}

// blog
function blog(req, res) {
  const isLogin = req.session.isLogin;

  if (!isLogin) {
    req.flash("danger", "Anda tidak mempunyai akses ini!");
    return res.redirect("/");
  }

  res.render("blog", { isLogin, user: req.session.user });
}

// form blog
function formBlog(req, res) {
  res.render("form-blog", {
    isLogin: req.session.isLogin,
    user: req.session.user,
  });
}

// contact me
function contact(req, res) {
  res.render("contact", {
    isLogin: req.session.isLogin,
    user: req.session.user,
  });
}

//testimonial
function testimonial(req, res) {
  res.render("testimonial", {
    isLogin: req.session.isLogin,
    user: req.session.user,
  });
}

// form register
function formRegister(req, res) {
  const isLogin = req.session.isLogin;

  if (isLogin) {
    req.flash("danger", "Anda sudah masuk ke akun anda!");
    return res.redirect("/");
  }

  res.render("register", {
    isLogin: req.session.isLogin,
    user: req.session.user,
  });
}

// form login
function formLogin(req, res) {
  const isLogin = req.session.isLogin;

  if (isLogin) {
    req.flash("danger", "Anda sudah masuk ke akun anda!");
    return res.redirect("/");
  }

  res.render("login", { isLogin: req.session.isLogin, user: req.session.user });
}

// blog detail
async function blogDetail(req, res) {
  try {
    const { id } = req.params;

    const query = `SELECT projects.id, tittle, content, "startDate", "endDate", technologies, images, users.name AS author FROM projects LEFT JOIN users ON projects.author = users.id WHERE projects.id = ${id}`;
    let obj = await sequelize.query(query, { type: QueryTypes.SELECT });

    obj.forEach((item) => {
      item.duration = dateDuration(item.startDate, item.endDate);
      item.techs = viewIconHbs(item.technologies);
    });

    console.log(obj);
    res.render("blog-detail", {
      blog: obj[0],
      isLogin: req.session.isLogin,
      user: req.session.user,
    });
  } catch (err) {
    console.log(err);
  }
  // const { id } = req.params;

  // res.render("blog-detail", { blog: dataBlog[id] });
}

// add a new blog
async function addBlog(req, res) {
  try {
    let { tittle, startDate, endDate, content, nodejs, js, react, vuejs } =
      req.body;

    const idUser = req.session.idUser;
    const images = req.file.filename;

    console.log(tittle);
    console.log(startDate);
    console.log(endDate);
    console.log(content);
    console.log(nodejs);
    console.log(js);
    console.log(react);
    console.log(vuejs);
    console.log(images);

    let techs = { nodejs, js, react, vuejs };
    let technologies = techArray(techs);
    console.log(technologies);
    // check which technologies are selected and add them to the database

    const query = `INSERT INTO projects (tittle,content, "startDate", "endDate", technologies,images,author) VALUES ('${tittle}','${content}', '${startDate}', '${endDate}', ARRAY[${technologies}],'${images}',${idUser})`;
    await sequelize.query(query, { type: QueryTypes.INSERT });

    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
}

// view edit Blog with index/id
async function viewEditBlog(req, res) {
  try {
    const { id } = req.params;

    const isLogin = req.session.isLogin;

    if (!isLogin) {
      req.flash("danger", "Anda tidak mempunyai akses ini!");
      return res.redirect("/");
    }

    const query = `SELECT projects.id, tittle, content, "startDate", "endDate", technologies, images, users.name AS author FROM projects LEFT JOIN users ON projects.author = users.id WHERE projects.id = ${id}`;
    let obj = await sequelize.query(query, { type: QueryTypes.SELECT });

    if (!obj.length) {
      req.flash("danger", "Data Not Found!!");
      return res.redirect("/");
    }

    obj.forEach((item) => {
      let array = item.technologies;

      item.nodejs = false;
      item.js = false;
      item.react = false;
      item.vuejs = false;

      for (let i = 0; i < array.length; i++) {
        if (array[i] === "nodejs") {
          item.nodeJs = true;
        } else if (array[i] === "js") {
          item.js = true;
        } else if (array[i] === "react") {
          item.react = true;
        } else if (array[i] === "vuejs") {
          item.vuejs = true;
        }
      }
    });
    console.log(obj);
    res.render("edit-blog", {
      edit: obj[0],
      isLogin: req.session.isLogin,
      user: req.session.user,
    });
  } catch (err) {
    console.log(err);
  }
}

// edit blog
async function updateBlog(req, res) {
  try {
    const { id } = req.params;

    let images = "";
    // upload image
    if (req.file) {
      images = req.file.filename;
    } else if (!images) {
      const query = `SELECT projects.id, tittle, content, "startDate", "endDate", technologies, users.name AS author FROM projects LEFT JOIN users ON projects.author = users.id WHERE projects.id = ${id} `;
      let obj = await sequelize.query(query, { type: QueryTypes.SELECT });
      images = obj[0].images;
    }
    const { tittle, content, startDate, endDate, nodejs, js, react, vuejs } =
      req.body;

    console.log(
      tittle,
      content,
      startDate,
      endDate,
      nodejs,
      js,
      react,
      vuejs,
      images
    );

    let techs = { nodejs, js, react, vuejs };
    let technologies = techArray(techs);
    console.log(technologies);
    // check which technologies are selected and add them to the database
    const query = `UPDATE projects SET tittle = '${tittle}', content = '${content}', "startDate" = '${startDate}', "endDate" = '${endDate}', technologies = ARRAY[${technologies}], images = '${images}' WHERE ID = ${id}`;

    await sequelize.query(query, { type: QueryTypes.UPDATE });
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
}

async function deleteBlog(req, res) {
  try {
    const { id } = req.params;

    await sequelize.query(`DELETE FROM projects WHERE id = ${id}`);

    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
}

async function userLogin(req, res) {
  try {
    const { email, password } = req.body;
    const query = `SELECT * FROM users WHERE email = '${email}'`;
    let obj = await sequelize.query(query, { type: QueryTypes.SELECT });

    if (!obj.length) {
      req.flash("danger", "user has not been registered");
      return res.redirect("/login");
    }

    await bcrypt.compare(password, obj[0].password, (err, result) => {
      if (!result) {
        req.flash("danger", "password wrong");
        return res.redirect("/login");
      } else {
        (req.session.isLogin = true), (req.session.user = obj[0].name);
        req.session.idUser = obj[0].id;
        // (req.session.isLogin = true), (req.session.user = obj[0].name);
        req.flash("success", " login success");
        return res.redirect("/");
      }
    });
  } catch (err) {
    throw err;
  }
}

async function addUser(req, res) {
  try {
    const { name, email, password } = req.body;

    if (
      req.body.name == "" ||
      req.body.email == "" ||
      req.body.password == ""
    ) {
      req.flash(
        "danger",
        "Data Kosong! Tolong isikan data ada pada form Register!"
      );
      return res.redirect("/register");
    }

    const queryEmail = `SELECT * FROM users WHERE email = '${email}'`;
    let obj = await sequelize.query(queryEmail, { type: QueryTypes.SELECT });

    if (obj.length) {
      req.flash("danger", "Email sudah terpakai! Masukan email yang lain");
      return res.redirect("/register");
    }

    // await bcrypt.hash(password, 10, (err, hashPassword) => {
    //   const query = `INSERT INTO users (name, email, password, "createdAt", "updatedAt") VALUES ('${name}', '${email}', '${hashPassword}', NOW(), NOW())`;
    //   sequelize.query(query);
    // });
    bcrypt.hash(password, 10, async (err, hash) => {
      if (err) {
        console.error("Password failed to be encrypted!");
        req.flash(
          "danger",
          "Register failed : password failed to be encrypted!"
        );
        return res.redirect("/register");
      }

      console.log("hash didapatkan :", hash);
      const query = `INSERT INTO users (name, email, password, "createdAt", "updatedAt") VALUES ('${name}', '${email}', '${hash}', NOW(), NOW())`;

      await sequelize.query(query, { type: QueryTypes.INSERT });

      // (req.session.isLogin = true), (req.session.user = name);

      const queryLogin = `SELECT * FROM users WHERE email = '${email}'`;
      let obj = await sequelize.query(queryLogin, { type: QueryTypes.SELECT });
      console.log(obj);
      (req.session.isLogin = true), (req.session.user = obj[0].name);
      req.session.idUser = obj[0].id;

      req.flash("success", "Register Berhasil! Selamat Datang!");
      res.redirect("/");
    });
  } catch (err) {
    throw err;
  }
}

function userLogout(req, res) {
  req.session.isLogin = false;
  req.session.name = "";
  req.flash("success", "Anda telah logout dari akun anda");
  res.redirect("/");
}

function viewIcon(icon) {
  let codeIcon = "";

  for (i = 0; i < icon.length; i++) {
    if (icon[i] == "nodejs") {
      codeIcon += `<i class="fa-brands fa-node-js"></i>`;
    } else if (icon[i] == "js") {
      codeIcon += `<i class="fa-brands fa-js"></i>`;
    } else if (icon[i] == "react") {
      codeIcon += `<i class="fa-brands fa-react"></i>`;
    } else if (icon[i] == "vuejs") {
      codeIcon += `<i class="fa-brands fa-vuejs"></i>`;
    }
  }

  return codeIcon;
}

function viewIconHbs(icon) {
  let codeIcon = "";

  for (i = 0; i < icon.length; i++) {
    if (icon[i] == "nodejs") {
      codeIcon += `<i class="fa-brands fa-node-js" style="font-size: 80px; margin-right: 8px;"></i>`;
    } else if (icon[i] == "js") {
      codeIcon += `<i class="fa-brands fa-js" style="font-size: 80px; margin-right: 8px;"></i>`;
    } else if (icon[i] == "react") {
      codeIcon += `<i class="fa-brands fa-react" style="font-size: 80px; margin-right: 8px;"></i>`;
    } else if (icon[i] == "vuejs") {
      codeIcon += `<i class="fa-brands fa-vuejs" style="font-size: 80px; margin-right: 8px;"></i>`;
    }
  }

  return codeIcon;
}

function techArray(techs) {
  let technologies = [];

  if (techs.nodejs == "nodejs") {
    technologies.push(`'nodejs'`);
  }
  if (techs.js == "js") {
    technologies.push(`'js'`);
  }
  if (techs.react == "react") {
    technologies.push(`'react'`);
  }
  if (techs.vuejs == "vuejs") {
    technologies.push(`'vuejs'`);
  }

  return technologies;
}
