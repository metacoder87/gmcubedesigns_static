// Search

const menuIcon = document.getElementById("menu-icon");
const slideoutMenu = document.getElementById("slideout-menu");
const searchIcon = document.getElementById("search-icon");
const searchBox = document.getElementById('searchbox');

searchIcon.addEventListener('click', function() {
  if (searchBox.style.top == '72px') {
    searchBox.style.top = '18px';
    searchBox.style.pointerEvents = 'none';
  } else {
    searchBox.style.top = '72px';
    searchBox.style.pointerEvents = 'auto';
  }
});

menuIcon.addEventListener('click', function() {
  if (slideoutMenu.style.opacity == "1") {
    slideoutMenu.style.opacity = '0';
    slideoutMenu.style.pointerEvents = 'none';
  } else {
    slideoutMenu.style.opacity = '1';
    slideoutMenu.style.pointerEvents = 'auto';
  }
});

function googlerOne() {
  let inputOne = document.getElementById("queryOne").value;
  let link = "https://www.google.com/search?q=" + inputOne;
  window.open(link);
};

function googlerTwo() {
  let inputTwo = document.getElementById("queryTwo").value;
  let link = "https://www.google.com/search?q=" + inputTwo;
  window.open(link);
};

// Image Slider

// var img = document.getElementById('slider-img');
// var images = [];
// var x = 0;

// function slide(){
//     if (x < images.length) {
//         x = x + 1;
//     }else{
//         x = 1;
//     }
//     img.innerHTML = "<img src='img/" + images[x-1] + "'>";
// }

// function slideBack(){
//     if (x < images.length + 1 && x > 1) {
//         x = x - 1;
//     }else{
//         x = images.length;
//     }
//     img.innerHTML = "<img src='img/" + images[x-1] + "'>";
// }


// // auto slide timing

// setInterval(slide, 7000);
