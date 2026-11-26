# Architecture rules
- Operation forms share SubAccountFields and pure sub-account selection helpers; analytic entities are linked by parent account number and type, preventing cross-account suggestions.
- Preserve existing transaction property names when replacing account selectors so stored operations remain readable.- Inventory module lives in src/components/inventory with pure logic in src/utils/inventory.ts and a separate localStorage key; stock quantities are stored in the smallest unit so unit conversion stays consistent.
