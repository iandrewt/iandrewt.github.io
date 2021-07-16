const menuItems = document.querySelectorAll('#sidebar .menu-item');

// Animate sidebar menu items
const animateMenuItems = () => {
  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    // Stagger transition with transitionDelay
    item.style.transitionDelay = (i * 75) + 'ms';
    item.classList.toggle('menu-item--moved');
  }
};

const myWrapper = document.querySelector('.wrapper');
const myMenu = document.querySelector('.sidebar');
const myToggle = document.querySelector('.toggle');

// Toggle sidebar visibility
const toggleClassMenu = () => {
  myMenu.classList.add('menu--animatable');
  if (!myMenu.classList.contains('sidebar--visible')) {
    myMenu.classList.add('sidebar--visible');
    myToggle.classList.add('open');
    myWrapper.classList.add('wrapper--pushed');
  } else {
    myMenu.classList.remove('sidebar--visible');
    myToggle.classList.remove('open');
    myWrapper.classList.remove('wrapper--pushed');
  }
};

// Animation smoother
const OnTransitionEnd = () => {
  myMenu.classList.remove('menu--animatable');
};

myMenu.addEventListener('transitionend', OnTransitionEnd, false);
myToggle.addEventListener('click', function () {
  toggleClassMenu();
  animateMenuItems();
}, false);
myMenu.addEventListener('click', function () {
  toggleClassMenu();
  animateMenuItems();
}, false);
