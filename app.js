//jshint esversion:6

const express = require("express");
const https = require("https");
const http = require("http");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const date = require(__dirname + "/date.js");



const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://admin-ander:03511579@cluster0.xnjgc.mongodb.net/todolistDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
//create mongoose schema
const itemsSchema = {
  name: String
};
//create mongoose model based on mongoose schema
const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];
//create list schema
const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);


let idAddress;
let region;
let regionUrl;
let weatherData;
let temp;
let weatherDescription;
let icon;
let imageURL;
let city;

app.get("/", function(req, res) {
  const day = date.getDate();
  /////IP Address Session Start/////
  if (!idAddress) {
    idAddress = req.headers["x-forwarded-for"];
    if (idAddress) {
      var list = idAddress.split(",");
      ipAddr = list[list.length - 1];
    } else {
      idAddress = req.connection.remoteAddress;
    }
    regionUrl = "http://api.ipstack.com/" + idAddress + "?access_key=6ad4c8a26dedfa6ee5183b99210202e7&fields=city,region_name";

    //test on local Server
    //regionUrl = "https://api.ipstack.com/24.75.195.117?access_key=6ad4c8a26dedfa6ee5183b99210202e7&fields=city,region_name";
  }

  https.get(regionUrl, function(response) {
    response.on("data", function(data) {
      region = JSON.parse(data);
      console.log(region);

      ///////Weather Session Start//////
      city = region.city;
      console.log(city);
      const apiKey = "f00a69f9e3c4421cb4b8a54b12432d83";
      const unit = "metric";
      const url = "https://api.openweathermap.org/data/2.5/weather?q=" + city + "&appid=" + apiKey + "&units=" + unit;

      https.get(url, function(response) {
        response.on("data", function(data) {
          weatherData = JSON.parse(data);
          city = region.city;
          console.log(city);
          temp = weatherData.main.temp;
          console.log(temp);
          weatherDescription = weatherData.weather[0].description;
          console.log(weatherDescription);
          icon = weatherData.weather[0].icon;
          imageURL = "http://openweathermap.org/img/wn/" + icon + "@2x.png";
          // res.write("<h1>The weather is currently " + weatherDescription + "</h1>");
          // res.write("<h1>The temperature in " + query +" is " + temp + " degrees Celcius</h1>");
          // res.write("<img src=" + imageURL + ">");
          // res.send();
        });
      });
      ////////Weather session End///////
    });
  });
  console.log(city);

  Item.find({}, function(err, foundItems){

    if(foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err){
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully saved default items to DB.");
        }
      });
      res.redirect("/");
    } else {
      res.render("list", {
        listTitle: "Today",
        newListItems: foundItems,
        weD: weatherDescription,
        temperature: temp,
        cityPlace: city,
        weI: icon,
        weImage: imageURL,
        date: day
      });
    }

  });

});

app.get("/:customListName", function(req, res) {
  const customListName = _.capitalize(req.params.customListName);
  day = date.getDate();
  List.findOne({
    name: customListName
  }, function(err, foundList) {
    if (!err) {
      if (!foundList) {
        //Create a new list
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        //Show an existing list
        res.render("list", {
          listTitle: foundList.name,
          newListItems: foundList.items,
          weD: weatherDescription,
          temperature: temp,
          cityPlace: city,
          weI: icon,
          weImage: imageURL,
          date: day
        });
      }
    }
  });
});

app.post("/", function(req, res) {

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({
      name: listName
    }, function(err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }

});

app.post("/delete", function(req, res) {

  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId, function(err) {
      if (!err) {
        console.log("Successfully deleted checked item.");
        res.redirect("/");
      }
    });
  } else {
    List.findOneAndUpdate({
      name: listName
    }, {
      $pull: {
        items: {
          _id: checkedItemId
        }
      }
    }, function(err, foundList) {
      if (!err) {
        res.redirect("/" + listName);
      }
    });
  }
});

app.get("/work", function(req, res) {
  res.render("list", {
    listTitle: "Work List",
    newListItems: workItems
  });
});

app.get("/about", function(req, res) {
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
