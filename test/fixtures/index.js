
console.log(
  'some',
  'code',
  op(4, 2)
)

function op (a, b) {
  return mul(add(a, b), add(a, b))
}

function mul (a, b) {
  return a * b
}

function add (a, b) {
  return a + b
}
