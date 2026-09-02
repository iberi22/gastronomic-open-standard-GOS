# How to Decide What to Eat

Deciding what to eat is also a big problem for me before cooking. So I can only describe it mathematically.

## Calculation Method

### Calculate the Number of Meat and Vegetable Dishes

* Number of dishes = number of people + 1.
* Meat dishes should be one more than vegetable dishes, or the same.

From this, get the number of meat and vegetable dishes, then choose from the recipes in the previous step.

#### Formal Language Description

When there are `N` people,
Let `vegetable dishes` be `a`, `meat dishes` be `b`.
`N`, `a`, `b` are all integers.

There are the following inequalities:

* a + b = N + 1
* a ≤ b ≤ a+1

Solved as

```javascript
const a = Math.floor((N+1)/2);
const b = Math.ceil((N+1)/2);
```

### Dish Selection

* If the number of people exceeds 8, consider adding fish meat dishes in the meat dishes.
* If there are children, consider adding dishes with sweet taste.
* Consider adding specialty dishes, signature dishes.
* When deciding on meat dishes, do not use all the same animal's meat. Consider the order: `pork`, `chicken`, `beef`, `lamb`, `duck`, `fish`.
* Do not choose strange animals for meat dishes.
