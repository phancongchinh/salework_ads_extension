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
  let shopeeCookieString = "";
  for (const cookie of spcCookies) {
    shopeeCookieString = shopeeCookieString.concat(cookie.name).concat("=").concat(cookie.value).concat(";");
  }
  const body = {
    "evn-token": evnToken?.value,
    "target-shop": targetShop,
    "shopee-cookie": shopeeCookieString
  }
  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = async function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        const response = this.response;
        if (response.success)
          await getConnectedShops();
        else
          await clearShopeeCookies();
      } else await clearShopeeCookies(spcCookies);
    }
  };
  xhr.responseType = "json";
  xhr.withCredentials = true;
  xhr.open("post", "https://ads.salework.net/api/extension/connect", true);
  xhr.send(JSON.stringify(body));
}

async function clearShopeeCookies(spcCookies) {
  if (confirm("Vui lòng đăng nhập tài khoản Shopee cần liên kết và thao tác lại!")) {
    for (const cname of spcCookies.map(c => c.name)) {
      await chrome.cookies.remove({"url": "https://shopee.vn", "name": cname}, () => {
      });
    }
    window.open("https://shopee.vn/seller/login");
  }
}

async function getConnectedShops() {
  const evnToken = await getCookies("https://salework.net", "evn-token");
  if (!evnToken || !evnToken?.value) return;

  const body = {
    "evn-token": evnToken?.value,
  }
  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      console.log(this.responseText);
      const response = this.response;
      const swUsername = response['sw_username'];
      const dataTable = document.getElementById("data-table");
      while (dataTable.firstChild) {
        dataTable.firstChild.remove();
      }
      response?.shops.forEach(s => {
        const row = document.createElement("tr");
        const active = document.createElement('i');
        active.classList.add('glyphicon', 'glyphicon-ok', 'text-success');
        const expiry = document.createElement('i');
        expiry.classList.add('glyphicon', 'glyphicon-refresh', 'text-danger');
        expiry.style.cursor = 'pointer';
        expiry.addEventListener("click", () => {
          doConnect(s.username)
        });
        const cell1 = document.createElement("td");
        cell1.appendChild(document.createTextNode(swUsername))
        const cell2 = document.createElement("td");
        cell2.appendChild(document.createTextNode(s.username))
        const cell3 = document.createElement("td");
        cell3.appendChild(s.forceReLogin ? expiry : active);
        row.appendChild(cell1);
        row.appendChild(cell2);
        row.appendChild(cell3);
        dataTable.appendChild(row);
      })
    }
  };
  // xhr.responseType = 'json';
  xhr.open("post", "http://ads.salework.net/api/extension/connected", true);
  xhr.send(JSON.stringify(body));
}

getConnectedShops();
