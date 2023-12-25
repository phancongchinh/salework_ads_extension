document.getElementById('link-btn').addEventListener('click', async function () {
  const spcCookies = await getCookies("https://shopee.vn");
  clearShopeeCookies(spcCookies);
})

async function getCookies(domain, name) {
  return name ?
    await chrome.cookies.get({"url": domain, "name": name}) :
    await chrome.cookies.getAll({"url": domain});
}

async function doConnect(targetShop) {
  const evnToken = await getCookies("https://salework.net", "evn-token");

  if (!evnToken || !evnToken.value)
    alert('Vui lòng đăng nhập tài khoản Salework!');

  await checkCurrentShopeeSession(targetShop, evnToken);
}

async function checkCurrentShopeeSession(targetShop, evnToken) {
  const spcCookies = await getCookies("https://shopee.vn");
  let spcString = "";
  for (const cookie of spcCookies) {
    spcString = spcString.concat(cookie.name).concat("=").concat(cookie.value).concat(";");
  }
  const body = {
    "evn-token": evnToken ? evnToken.value : '',
    "target-shop": targetShop,
    "shopee-cookie": spcString
  }
  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = async function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        const response = this.response;
        if (response.data.success) {
          await getConnectedShopsAndCurrentShopeeSession();
          document.getElementById('msg-success').innerText = 'Liên kết thành công!'
        } else {
          await clearShopeeCookies(spcCookies);
          document.getElementById('msg-fail').innerText = 'Liên kết không thành công!'
        }

      } else await clearShopeeCookies(spcCookies);
    }
  };
  xhr.responseType = "json";
  xhr.open("post", "https://ads.salework.net/api/extension/connect", true);
  xhr.setRequestHeader('Content-Type', 'application/json;charset=UFT-8');
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.send(JSON.stringify(body));
}

async function clearShopeeCookies(spcCookies) {
  if (confirm("Vui lòng đăng nhập tài khoản Shopee cần liên kết và thao tác lại!")) {
    if (spcCookies) {
      await Promise.all(spcCookies.map(async spc => {
        await chrome.cookies.remove({"url": "https://shopee.vn", "name": spc.name}, () => {
        });
      }));
    }
    window.open("https://shopee.vn/seller/login");
  }
}

async function getConnectedShopsAndCurrentShopeeSession() {
  const evnToken = await getCookies("https://salework.net", "evn-token");
  if (!evnToken || !evnToken?.value) {
    if (confirm("Vui lòng đăng nhập tài khoản Salework cần liên kết và thao tác lại!")) {
      window.open("https://salework.net/login/");
    }
  }

  const spcCookies = await getCookies("https://shopee.vn");
  let spcString = "";
  for (const cookie of spcCookies) {
    spcString = spcString.concat(cookie.name).concat("=").concat(cookie.value).concat(";");
  }

  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      const response = this.response.data;
      const swUsername = response['sw_username'];
      const connected = document.getElementById("connected");
      const current = document.getElementById("current");

      while (connected.firstChild) {
        connected.firstChild.remove();
      }
      while (current.firstChild) {
        current.firstChild.remove();
      }

      response?.shops.forEach(s => {
        const rowConnected = document.createElement("tr");

        const active = document.createElement('i');
        active.classList.add('glyphicon', 'glyphicon-ok', 'text-success');

        const expiry = document.createElement('i');
        expiry.classList.add('glyphicon', 'glyphicon-refresh', 'text-danger');
        expiry.style.cursor = 'pointer';
        expiry.addEventListener("click", () => {
          doConnect(s.username);
        });

        const adsIconImg = document.createElement('img');
        adsIconImg.style.marginTop = '-6px';
        adsIconImg.style.marginRight = '10px';
        adsIconImg.src = 'icon/ads.png';
        adsIconImg.height = 15;
        adsIconImg.width = 15;

        const shopeeIconImg = document.createElement('img');
        shopeeIconImg.style.marginTop = '-6px';
        shopeeIconImg.style.marginRight = '10px';
        shopeeIconImg.src = 'icon/shopee.png';
        shopeeIconImg.height = 19;
        shopeeIconImg.width = 19;

        const adsCell = document.createElement("td");
        adsCell.style.width = '200px';
        adsCell.appendChild(adsIconImg);
        adsCell.appendChild(document.createTextNode(swUsername));

        const shopeeCell = document.createElement("td");
        shopeeCell.style.width = '200px';
        shopeeCell.appendChild(shopeeIconImg);
        shopeeCell.appendChild(document.createTextNode(s.username));

        const statusCell = document.createElement("td");
        statusCell.appendChild(s.forceReLogin ? expiry : active);

        rowConnected.appendChild(adsCell);
        rowConnected.appendChild(shopeeCell);
        rowConnected.appendChild(statusCell);
        connected.appendChild(rowConnected);
      });

      const currentShopeeAccount = response['sp_username'] || undefined;
      const rowCurrent = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.style.width = '200px';
      rowCurrent.appendChild(emptyCell);

      const connectCell = document.createElement("td");

      const currentAlreadyConnected = response?.shops.map(s => s.username).includes(currentShopeeAccount);

      if (currentAlreadyConnected) {
        const current = response?.shops.find(s => s.username.toString() === currentShopeeAccount.toString());
        if (current.forceReLogin) {
          const expiry = document.createElement('i');
          expiry.classList.add('glyphicon', 'glyphicon-refresh', 'text-danger');
          expiry.style.cursor = 'pointer';
          expiry.addEventListener("click", () => {
            doConnect(current.username);
          });
          connectCell.appendChild(expiry);
        } else {
          const active = document.createElement('i');
          active.classList.add('glyphicon', 'glyphicon-ok', 'text-success');
          connectCell.appendChild(active);
        }

      } else {
        if (currentShopeeAccount) {
          const connectBtn = document.createElement('i');
          connectBtn.classList.add('glyphicon', 'glyphicon-link', 'text-primary');
          connectBtn.style.cursor = 'pointer';
          connectBtn.title = 'Bấm để liên kết';
          connectBtn.addEventListener("click", () => {
            doConnect(currentShopeeAccount);
          });
          connectCell.appendChild(connectBtn);
        }
      }
      
      const currentSpCell = document.createElement("td");
      currentSpCell.style.width = '200px';
      const shopeeIconImg = document.createElement('img');
      shopeeIconImg.style.marginTop = '-6px';
      shopeeIconImg.style.marginRight = '10px';
      shopeeIconImg.src = 'icon/shopee.png';
      shopeeIconImg.height = 19;
      shopeeIconImg.width = 19;
      currentSpCell.appendChild(shopeeIconImg);
      currentSpCell.appendChild(document.createTextNode(currentShopeeAccount ? currentShopeeAccount : 'Chưa đăng nhập'));
      
      rowCurrent.appendChild(currentSpCell);
      rowCurrent.appendChild(connectCell);
      current.appendChild(rowCurrent);
    }
  };
  xhr.responseType = 'json';
  xhr.open("post", "https://ads.salework.net/api/extension/connected", true);
  xhr.setRequestHeader('Content-Type', 'application/json;charset=UFT-8');
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.send(JSON.stringify({
    "evn-token": evnToken?.value,
    "shopee-cookie": spcString
  }));
}

getConnectedShopsAndCurrentShopeeSession();
