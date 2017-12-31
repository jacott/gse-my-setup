var pointInRect = (x, y, rect)=> rect.x < x && rect.y < y &&
    rect.x+rect.width > x && rect.y+rect.height > y;

var rectIntersect = (r1, r2)=> r1.y <= r2.y+r2.height && r1.y+r1.height >= r2.y &&
    r1.x <= r2.x+r2.width && r1.x+r1.width >= r2.x;
