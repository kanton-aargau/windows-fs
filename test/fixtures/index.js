
const math = require('./math')

console.log(
  'some',
  'code',
  op(4, 2)
)

function op (a, b) {
  return math.mul(math.add(a, b), math.add(a, b))
}