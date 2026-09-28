const KEY = "stockmanager_pro_v1";

let state =
JSON.parse(localStorage.getItem(KEY) || "null") ||
{
products: [],
movements: [],
theme: "light"
};

const $ = id => document.getElementById(id);

const money = n =>
"$" +
Number(n || 0).toLocaleString("en-US", {
minimumFractionDigits: 2,
maximumFractionDigits: 2
});


/* =========================
STORAGE
========================= */

function save() {
localStorage.setItem(KEY, JSON.stringify(state));
}


/* =========================
ID
========================= */

function uid() {
return (
Date.now().toString(36) +
Math.random().toString(36).slice(2, 7)
);
}


/* =========================
PRODUCT STATUS
========================= */

function status(product) {

if (product.stock <= 0) {
return "out";
}

if (product.stock <= product.minimum) {
return "low";
}

return "in";
}


function statusBadge(product) {

const s = status(product);

return `
<span class="badge ${
s === "out"
? "stockout"
: s
}">
${
s === "out"
? "Out of Stock"
: s === "low"
? "Low Stock"
: "In Stock"
}
</span>
`;
}


/* =========================
TOAST
========================= */

function toast(message) {

$("toast").textContent = message;

$("toast").classList.add("show");

clearTimeout(window.toastTimer);

window.toastTimer = setTimeout(() => {

$("toast").classList.remove("show");

}, 2500);
}


/* =========================
MAIN RENDER
========================= */

function render() {

renderStats();

renderProducts();

renderHistory();

renderRecent();

renderAlerts();

populateProducts();

populateCategories();

updatePreview();

save();
}


/* =========================
DASHBOARD STATISTICS
========================= */

function renderStats() {

const products = state.products;

const incoming =
state.movements
.filter(m => m.type === "in")
.reduce((total, m) => total + m.qty, 0);

const outgoing =
state.movements
.filter(m => m.type === "out")
.reduce((total, m) => total + m.qty, 0);

const stock =
products.reduce(
(total, product) => total + product.stock,
0
);

const value =
products.reduce(
(total, product) =>
total + product.stock * product.price,
0
);

const alerts =
products.filter(
product => status(product) !== "in"
).length;


$("statProducts").textContent = products.length;

$("statIn").textContent = incoming;

$("statOut").textContent = outgoing;

$("statStock").textContent = stock;

$("statValue").textContent = money(value);

$("statAlerts").textContent = alerts;


/* DONUT */

$("donutTotal").textContent = products.length;

const good =
products.filter(
product => status(product) === "in"
).length;

const low =
products.filter(
product => status(product) === "low"
).length;

const out =
products.filter(
product => status(product) === "out"
).length;


$("goodCount").textContent = good;

$("lowCount").textContent = low;

$("outCount").textContent = out;


const total = products.length || 1;

$("donut").style.background =
`conic-gradient(
var(--green) 0 ${good / total * 100}%,
var(--orange) ${good / total * 100}% ${(good + low) / total * 100}%,
var(--red) ${(good + low) / total * 100}% 100%
)`;


/* STOCK BARS */

const max =
Math.max(
1,
...products.map(product => product.stock)
);


$("stockBars").innerHTML =
products.length

? products
.slice(0, 8)
.map(product => {

const height =
Math.max(
12,
product.stock / max * 110
);

return `
<div class="bar-item">

<div
class="bar"
style="height:${height}px"
title="${product.stock}"
></div>

<b>${product.stock}</b>

<small>
${esc(product.name)}
</small>

</div>
`;

})
.join("")

: `
<div class="empty">
No products yet.
</div>
`;
}


/* =========================
RECENT MOVEMENTS
========================= */

function renderRecent() {

const rows =
[...state.movements]
.sort((a, b) => b.time - a.time)
.slice(0, 7);


$("recentTable").innerHTML =

rows.length

? rows
.map(m => `

<tr>

<td>${date(m.time)}</td>

<td>${esc(m.ref)}</td>

<td>${esc(m.name)}</td>

<td>${esc(m.category)}</td>

<td>
<span class="badge ${m.type}">
${
m.type === "in"
? "Stock In"
: "Stock Out"
}
</span>
</td>

<td>${m.qty}</td>

<td>${m.after}</td>

</tr>

`)
.join("")

: `
<tr>
<td
colspan="7"
class="empty"
>
No movements recorded yet.
</td>
</tr>
`;
}


/* =========================
PRODUCTS
========================= */

function renderProducts() {

const search =
($("productSearch")?.value || "")
.toLowerCase();

const category =
$("categoryFilter")?.value || "";

const selectedStatus =
$("statusFilter")?.value || "";


const products =
state.products.filter(product =>

(
product.name +
" " +
product.ref
)
.toLowerCase()
.includes(search)

&&

(
!category ||
product.category === category
)

&&

(
!selectedStatus ||
status(product) === selectedStatus
)

);


$("productsTable").innerHTML =

products.length

? products
.map(product => `

<tr>

<td>
<b>
${esc(product.ref)}
</b>
</td>

<td>
${esc(product.name)}
</td>

<td>
${esc(product.category)}
</td>

<td>
${money(product.price)}
</td>

<td>
<b>
${product.stock}
</b>
</td>

<td>
${product.minimum}
</td>

<td>
${statusBadge(product)}
</td>

<td>
${money(
product.stock *
product.price
)}
</td>

<td>

<button
class="action-btn"
onclick="editProduct('${product.id}')"
>
Edit
</button>

<button
class="action-btn delete"
onclick="deleteProduct('${product.id}')"
>
Delete
</button>

</td>

</tr>

`)
.join("")

: `
<tr>
<td
colspan="9"
class="empty"
>
No products found.
</td>
</tr>
`;
}


/* =========================
HISTORY
========================= */

function renderHistory() {

const search =
($("historySearch")?.value || "")
.toLowerCase();

const type =
$("historyType")?.value || "";

const sort =
$("historySort")?.value || "new";


let movements =
state.movements.filter(m =>

(
m.name +
" " +
m.ref +
" " +
(m.note || "")
)
.toLowerCase()
.includes(search)

&&

(
!type ||
m.type === type
)

);


movements.sort((a, b) => {

if (sort === "old") {
return a.time - b.time;
}

if (sort === "qtyHigh") {
return b.qty - a.qty;
}

if (sort === "qtyLow") {
return a.qty - b.qty;
}

return b.time - a.time;

});


$("historyTable").innerHTML =

movements.length

? movements
.map(m => `

<tr>

<td>${date(m.time)}</td>

<td>${esc(m.ref)}</td>

<td>${esc(m.name)}</td>

<td>${esc(m.category)}</td>

<td>

<span class="badge ${m.type}">

${
m.type === "in"
? "Stock In"
: "Stock Out"
}

</span>

</td>

<td>${m.qty}</td>

<td>${m.after}</td>

<td>${esc(m.note || "—")}</td>

</tr>

`)
.join("")

: `
<tr>
<td
colspan="8"
class="empty"
>
No history found.
</td>
</tr>
`;
}


/* =========================
ALERTS
========================= */

function renderAlerts() {

const products =
state.products.filter(
product => status(product) !== "in"
);


$("alertsGrid").innerHTML =

products.length

? products
.map(product => `

<div
class="alert-card ${
status(product) === "out"
? "out"
: ""
}"
>

<h3>
${esc(product.name)}
</h3>

<p>
${esc(product.ref)}
·
${esc(product.category)}
</p>

<div class="alert-stock">

${product.stock}

<small>
units
</small>

</div>

<p>

${
status(product) === "out"

? "The product is out of stock."

: `
Only ${product.stock}
units remain.
Minimum is
${product.minimum}.
`
}

</p>

</div>

`)
.join("")

: `
<div class="card">

<h3>
All good!
</h3>

<p>
No low-stock or out-of-stock products.
</p>

</div>
`;
}


/* =========================
PRODUCT SELECT
========================= */

function populateProducts() {

const select =
$("movementProduct");

const previous =
select.value;


select.innerHTML =
`
<option value="">
Select a product
</option>
`

+

state.products
.map(product => `

<option value="${product.id}">

${esc(product.ref)}
—
${esc(product.name)}
(${product.stock})

</option>

`)
.join("");


if (
state.products.some(
product => product.id === previous
)
) {
select.value = previous;
}
}


/* =========================
CATEGORIES
========================= */

function populateCategories() {

const categories =
[
...new Set(
state.products.map(
product => product.category
)
)
];


const previous =
$("categoryFilter").value;


$("categoryFilter").innerHTML =
`
<option value="">
All categories
</option>
`

+

categories
.map(category =>
`<option>${esc(category)}</option>`
)
.join("");


if (categories.includes(previous)) {
$("categoryFilter").value = previous;
}
}


/* =========================
MOVEMENT PREVIEW
========================= */

function updatePreview() {

const product =
state.products.find(
product =>
product.id ===
$("movementProduct").value
);


const quantity =
Number(
$("movementQty").value
) || 0;


const type =
$("movementType").value;


if (!product) {

$("movementPreview").textContent =
"Select a product to preview the new stock.";

return;
}


const finalStock =
type === "in"
? product.stock + quantity
: product.stock - quantity;


$("movementPreview").innerHTML = `

Current stock:
<b>${product.stock}</b>

→

New stock:
<b>${finalStock}</b>

${
type === "out" &&
finalStock < 0

? `
—
<span style="color:var(--red)">
Not allowed
</span>
`

: ""
}

`;
}


/* =========================
PRODUCT MODAL
========================= */

function openProduct(product = null) {

$("productModal")
.classList
.add("open");


$("modalTitle").textContent =
product
? "Edit Product"
: "Add Product";


$("editId").value =
product?.id || "";


$("productRef").value =
product?.ref || "";


$("productName").value =
product?.name || "";


$("productCategory").value =
product?.category || "";


$("productPrice").value =
product?.price ?? "";


$("productStock").value =
product?.stock ?? "";


$("productMinimum").value =
product?.minimum ?? "";
}


window.editProduct = id =>
openProduct(
state.products.find(
product => product.id === id
)
);


window.deleteProduct = id => {

const product =
state.products.find(
product => product.id === id
);


if (!product) {
return;
}


if (
confirm(
`Delete ${product.name}? This does not remove its history.`
)
) {

state.products =
state.products.filter(
product => product.id !== id
);


render();

toast("Product deleted.");
}
};


/* =========================
DATE
========================= */

function date(time) {

return new Date(time)
.toLocaleString(
"en-GB",
{
dateStyle: "short",
timeStyle: "short"
}
);
}


/* =========================
SECURITY / HTML ESCAPE
========================= */

function esc(value) {

return String(value ?? "")
.replace(
/[&<>'"]/g,
character => ({

"&": "&amp;",
"<": "&lt;",
">": "&gt;",
"'": "&#39;",
'"': "&quot;"

}[character])
);
}


/* =========================
NAVIGATION
========================= */

function go(section) {

document
.querySelectorAll(".page")
.forEach(page =>
page.classList.remove("active")
);


$(section)
.classList
.add("active");


document
.querySelectorAll(".nav-btn")
.forEach(button =>

button.classList.toggle(
"active",
button.dataset.section === section
)

);


$("pageTitle").textContent =
section === "movements"
? "Stock Movement"
: section[0].toUpperCase() +
section.slice(1);


window.scrollTo({
top: 0,
behavior: "smooth"
});
}


/* =========================
NAVIGATION EVENTS
========================= */

document
.querySelectorAll(".nav-btn")
.forEach(button => {

button.onclick = () =>
go(button.dataset.section);

});


document
.querySelectorAll("[data-go]")
.forEach(button => {

button.onclick = () =>
go(button.dataset.go);

});


$("openProduct").onclick =
() => openProduct();


document
.querySelectorAll("[data-close]")
.forEach(button => {

button.onclick = () =>
$(button.dataset.close)
.classList
.remove("open");

});


document
.querySelectorAll(".modal")
.forEach(modal => {

modal.onclick = event => {

if (event.target === modal) {

modal.classList.remove("open");

}

};

});


/* =========================
PRODUCT FORM
========================= */

$("productForm").onsubmit = event => {

event.preventDefault();


const id =
$("editId").value;


const ref =
$("productRef")
.value
.trim();


const name =
$("productName")
.value
.trim();


const category =
$("productCategory").value;


const price =
Number(
$("productPrice").value
);


const stock =
Number(
$("productStock").value
);


const minimum =
Number(
$("productMinimum").value
);


if (
!ref ||
!name ||
!category ||
price < 0 ||
stock < 0 ||
minimum < 0
) {

return toast(
"Please enter valid product information."
);

}


if (
state.products.some(
product =>
product.ref.toLowerCase() ===
ref.toLowerCase()
&&
product.id !== id
)
) {

return toast(
"Reference already exists."
);

}


if (id) {

const product =
state.products.find(
product => product.id === id
);


Object.assign(
product,
{
ref,
name,
category,
price,
stock,
minimum
}
);

}

else {

state.products.push({

id: uid(),

ref,

name,

category,

price,

stock,

minimum

});

}


$("productModal")
.classList
.remove("open");


render();


toast(
id
? "Product updated."
: "Product added successfully."
);
};


/* =========================
MOVEMENT TYPE
========================= */

let movementType = "in";


document
.querySelectorAll(".type-btn")
.forEach(button => {

button.onclick = () => {

movementType =
button.dataset.type;


$("movementType").value =
movementType;


document
.querySelectorAll(".type-btn")
.forEach(button =>
button.classList.remove(
"selected"
)
);


button.classList.add(
"selected"
);


updatePreview();
};

});


$("movementProduct")
.onchange =
updatePreview;


$("movementQty")
.oninput =
updatePreview;


/* =========================
MOVEMENT FORM
========================= */

$("movementForm").onsubmit = event => {

event.preventDefault();


const product =
state.products.find(
product =>
product.id ===
$("movementProduct").value
);


const quantity =
Number(
$("movementQty").value
);


const type =
$("movementType").value;


if (!product) {

return toast(
"Select a product."
);

}


if (
!Number.isInteger(quantity) ||
quantity < 1
) {

return toast(
"Quantity must be a positive whole number."
);

}


const finalStock =
type === "in"
? product.stock + quantity
: product.stock - quantity;


if (
type === "out" &&
finalStock < 0
) {

return toast(
`Not enough stock. Available: ${product.stock}.`
);

}


product.stock =
finalStock;


state.movements.push({

id: uid(),

time: Date.now(),

ref: product.ref,

name: product.name,

category: product.category,

type,

qty: quantity,

after: finalStock,

note:
$("movementNote")
.value
.trim()

});


event.target.reset();


$("movementType").value =
"in";


movementType =
"in";


document
.querySelectorAll(".type-btn")
.forEach(
(button, index) =>
button.classList.toggle(
"selected",
index === 0
)
);


render();


toast(
type === "in"
? "Stock added successfully."
: "Stock removed successfully."
);
};


/* =========================
SEARCH / FILTERS
========================= */

[
"productSearch",
"categoryFilter",
"statusFilter"
]
.forEach(id => {

$(id).addEventListener(
"input",
renderProducts
);

});


[
"historySearch",
"historyType",
"historySort"
]
.forEach(id => {

$(id).addEventListener(
"input",
renderHistory
);

});


/* =========================
CLEAR HISTORY
========================= */

$("clearHistory").onclick = () => {

if (
state.movements.length &&
confirm(
"Clear all movement history? Product stock will not be changed."
)
) {

state.movements = [];

render();

toast(
"History cleared."
);
}

};


/* =========================
RESET EVERYTHING
========================= */

$("resetBtn").onclick = () => {

if (
confirm(
"Reset ALL products, movements and settings? This cannot be undone."
)
) {

localStorage.removeItem(KEY);

location.reload();

}

};


/* =========================
DARK MODE
========================= */

$("themeBtn").onclick = () => {

state.theme =
state.theme === "dark"
? "light"
: "dark";


document.body.classList.toggle(
"dark",
state.theme === "dark"
);


$("themeBtn").innerHTML =
state.theme === "dark"

? "☀ <span>Light Mode</span>"

: "◐ <span>Dark Mode</span>";


save();
};


/* =========================
EXPORT CSV
========================= */

$("exportBtn").onclick = () => {

const rows = [

[
"Date",
"Reference",
"Product",
"Category",
"Type",
"Quantity",
"Stock After",
"Note"
],

...state.movements.map(
movement => [

date(movement.time),

movement.ref,

movement.name,

movement.category,

movement.type === "in"
? "Stock In"
: "Stock Out",

movement.qty,

movement.after,

movement.note || ""

]
)

];


const csv =
rows
.map(row =>
row
.map(value =>
'"' +
String(value)
.replace(/"/g, '""') +
'"'
)
.join(",")
)
.join("\n");


const blob =
new Blob(
[csv],
{
type: "text/csv"
}
);


const url =
URL.createObjectURL(blob);


const link =
document.createElement("a");


link.href = url;

link.download =
"stockmanager-history.csv";


link.click();


URL.revokeObjectURL(url);
};


/* =========================
MOBILE MENU
========================= */

$("mobileMenu").onclick = () => {

document
.querySelector(".app")
.classList
.toggle("mobile-open");

};


/* =========================
CLOCK
========================= */

setInterval(() => {

$("clock").textContent =
new Date()
.toLocaleString(
"en-GB",
{
dateStyle: "medium",
timeStyle: "short"
}
);

}, 1000);


/* =========================
INITIALIZATION
========================= */

document.body.classList.toggle(
"dark",
state.theme === "dark"
);


$("themeBtn").innerHTML =
state.theme === "dark"

? "☀ <span>Light Mode</span>"

: "◐ <span>Dark Mode</span>";


render();
