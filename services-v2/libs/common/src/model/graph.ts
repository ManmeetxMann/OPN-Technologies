export class Edge<T> {
  child: T
  parent?: T | null
}

// --- User
// INSERT INTO user VALUES (1, 'John');
// INSERT INTO user VALUES (2, 'Janette');
// INSERT INTO user VALUES (3, 'Henry');
// INSERT INTO user VALUES (4, 'Fred');

// --- Family tree
// ---- PK and FK = parentID
// INSERT INTO family_tree VALUES (1, null);
// INSERT INTO family_tree VALUES (2, null);
// INSERT INTO family_tree VALUES (3, 1);
// INSERT INTO family_tree VALUES (3, 2);
// INSERT INTO family_tree VALUES (4, 3);

// Retrieve tree
// SELECT parentID AS Parent, GROUP_CONCAT(childID) AS Children
// FROM familytree t
// JOIN family f ON t.parentID=f.ID
// GROUP BY parentID;
