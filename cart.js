(function () {
  var CART_KEY = 'alonaceramics_cart_v1';
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }
  function isInCart(id) {
    return cart.some(function (i) { return i.id === id; });
  }

  function addToCart(item) {
    if (!item || !item.id || isInCart(item.id)) return;
    cart.push(item);
    saveCart();
    renderAll();
  }
  function removeFromCart(id) {
    cart = cart.filter(function (i) { return i.id !== id; });
    saveCart();
    renderAll();
  }

  function renderCartDrawer() {
    var itemsWrap = document.getElementById('cartItems');
    var totalEl = document.getElementById('cartTotal');
    var emptyNote = document.getElementById('cartEmptyNote');
    var checkoutBtn = document.getElementById('cartCheckoutBtn');
    if (!itemsWrap) return; // no drawer markup on this page

    itemsWrap.innerHTML = '';
    var total = 0;

    cart.forEach(function (item) {
      var price = parseFloat((item.price || '0').replace(/[^0-9.]/g, ''));
      total += price;

      var row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML =
        '<img src="' + item.image + '" alt="' + item.title + '" />' +
        '<div class="cart-item-info">' +
          '<span class="cart-item-name">' + item.title + '</span>' +
          '<span class="cart-item-price">' + item.price + '</span>' +
        '</div>' +
        '<button type="button" class="cart-item-remove" aria-label="Remove ' + item.title + '">✕</button>';
      row.querySelector('.cart-item-remove').addEventListener('click', function () {
        removeFromCart(item.id);
      });
      itemsWrap.appendChild(row);
    });

    totalEl.textContent = '$' + total.toFixed(0);
    emptyNote.style.display = cart.length ? 'none' : 'block';
    checkoutBtn.style.display = cart.length ? 'block' : 'none';
  }

  function updateCartCount() {
    var el = document.getElementById('cartCount');
    if (el) el.textContent = cart.length;
  }

  function renderProductButtons() {
    document.querySelectorAll('.product[data-id]').forEach(function (el) {
      var id = el.dataset.id;
      var btn = el.querySelector('.add-cart-btn');
      if (!btn) return;
      if (el.dataset.soldOut === 'true') {
        btn.textContent = 'Sold out';
        btn.disabled = true;
        return;
      }
      if (isInCart(id)) {
        btn.textContent = '✓ In cart — remove';
        btn.classList.add('is-in-cart');
      } else {
        btn.textContent = '+ Add to cart';
        btn.classList.remove('is-in-cart');
      }
    });
  }

  function renderAll() {
    renderCartDrawer();
    updateCartCount();
    renderProductButtons();
    if (typeof window.syncModalCartButton === 'function' && window.currentModalId) {
      window.syncModalCartButton(window.currentModalId);
    }
  }

  // exposed globally so shop.html's product-modal code (and tile buttons) can use it
  window.cartApp = {
    isInCart: isInCart,
    addToCart: addToCart,
    removeFromCart: removeFromCart,
    renderAll: renderAll
  };

  document.addEventListener('DOMContentLoaded', function () {
    var cartToggle  = document.getElementById('cartToggle');
    var cartOverlay = document.getElementById('cartOverlay');
    var cartClose   = document.getElementById('cartClose');

    function openCart() {
      if (!cartOverlay) return;
      cartOverlay.classList.add('is-open');
      document.body.classList.add('modal-open');
    }
    function closeCart() {
      if (!cartOverlay) return;
      cartOverlay.classList.remove('is-open');
      document.body.classList.remove('modal-open');
    }

    if (cartToggle) cartToggle.addEventListener('click', openCart);
    if (cartClose) cartClose.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', function (e) {
      if (e.target === cartOverlay) closeCart();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && cartOverlay && cartOverlay.classList.contains('is-open')) closeCart();
    });

    // add-to-cart buttons on product tiles (present on shop.html)
    document.querySelectorAll('.product[data-id]').forEach(function (card) {
      var addBtn = card.querySelector('.add-cart-btn');
      if (!addBtn) return;
      addBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = card.dataset.id;
        if (isInCart(id)) {
          removeFromCart(id);
        } else {
          addToCart({
            id: id,
            title: card.dataset.title,
            price: card.dataset.price,
            priceId: card.dataset.priceId,
            image: (card.dataset.images || '').split(',')[0].trim()
          });
        }
      });
    });

    // checkout — works from any page now, since each cart item carries its own priceId
    var checkoutBtn = document.getElementById('cartCheckoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', function () {
        var items = cart
          .map(function (i) { return { priceId: i.priceId, title: i.title }; })
          .filter(function (i) { return i.priceId; });
        if (!items.length) return;

        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Redirecting…';

        fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: items })
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data.url) { window.location = data.url; }
            else { throw new Error('No checkout URL returned'); }
          })
          .catch(function () {
            alert('Could not start checkout. Please try again.');
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Checkout';
          });
      });
    }

    renderAll();
  });

  // keep the drawer in sync if the cart changes in another browser tab
  window.addEventListener('storage', function (e) {
    if (e.key === CART_KEY) {
      try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (err) { cart = []; }
      renderAll();
    }
  });
})();