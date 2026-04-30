#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微信第三方平台授权事件接收服务
用于接收微信服务器推送的 component_verify_ticket 等事件

使用方法:
    1. 安装依赖: pip install -r requirements.txt
    2. 设置环境变量或修改下方的默认配置
    3. 运行: python app.py
    4. 配置内网穿透/公网访问（ngrok/cpolar等）
    5. 在微信开放平台配置授权事件接收URL

微信官方文档:
    https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/2/Operation_specs/URL_configuration.html
"""

import os
import sys
import time
import random
import hashlib
import xml.etree.ElementTree as ET
from functools import wraps
from flask import Flask, request, make_response

# AES加解密
from Crypto.Cipher import AES
from Crypto.Util.padding import pad, unpad

# ============================================================
# 配置部分 - 可以通过环境变量覆盖
# ============================================================

class Config:
    """微信第三方平台配置"""
    
    # 第三方平台 AppID
    APPID = os.environ.get('WX_COMPONENT_APPID', '')
    
    # 第三方平台 AppSecret (预留)
    APPSECRET = os.environ.get('WX_COMPONENT_APPSECRET', '')
    
    # 消息校验 Token
    TOKEN = os.environ.get('WX_COMPONENT_TOKEN', '')
    
    # 消息加解密 Key (43位)
    AES_KEY = os.environ.get('WX_COMPONENT_AES_KEY', '')
    
    # 票据保存文件路径
    TICKET_FILE = 'component_ticket.txt'


# ============================================================
# AES 加解密工具类 - 严格参照微信官方实现
# ============================================================

class Prpcrypt:
    """
    微信消息加解密类
    基于微信官方示例代码实现
    """
    
    def __init__(self, key: str):
        """
        初始化加解密工具
        
        Args:
            key: 43位的AES Key，传入时需要先Base64解码
        """
        # Base64解码得到32字节的AES密钥
        import base64
        self.key = base64.b64decode(key + "=")
        
    def encrypt(self, text: str, appid: str) -> str:
        """
        加密消息
        
        Args:
            text: 待加密的明文
            appid: AppID
            
        Returns:
            Base64编码的密文
        """
        import base64
        
        # 1. 生成16字节随机数
        random_bytes = os.urandom(16)
        
        # 2. 构造明文 = random(16字节) + networkBytesOrder(text_len) + text + appid
        text_bytes = text.encode('utf-8')
        text_len = len(text_bytes)
        
        # 网络字节序：4字节的明文长度（大端序）
        network_bytes = text_len.to_bytes(4, byteorder='big', signed=False)
        
        # 明文 = 随机数(16) + 长度(4) + 内容 + appid
        plaintext = random_bytes + network_bytes + text_bytes + appid.encode('utf-8')
        
        # 3. PKCS7填充
        padded = pad(plaintext, AES.block_size, style='pkcs7')
        
        # 4. AES加密（CBC模式）
        cipher = AES.new(self.key, AES.MODE_CBC, random_bytes)
        encrypted = cipher.encrypt(padded)
        
        # 5. Base64编码
        return base64.b64encode(encrypted).decode('utf-8')
    
    def decrypt(self, encrypt_text: str) -> tuple:
        """
        解密消息
        
        Args:
            encrypt_text: Base64编码的密文
            
        Returns:
            (解密后的明文内容, AppID)
            
        Raises:
            Exception: 解密失败或AppID校验失败
        """
        import base64
        
        try:
            # 1. Base64解码
            encrypted = base64.b64decode(encrypt_text)
            
            # 2. AES解密（CBC模式，随机数作为IV）
            cipher = AES.new(self.key, AES.MODE_CBC, encrypted[:16])
            decrypted = cipher.decrypt(encrypted[16:])
            
            # 3. 去除PKCS7填充
            unpadded = unpad(decrypted, AES.block_size, style='pkcs7')
            
            # 4. 解析明文
            # 格式: random(16) + networkBytesOrder(text_len) + text + appid
            text_len_bytes = unpadded[16:20]
            text_len = int.from_bytes(text_len_bytes, byteorder='big', signed=False)
            
            # 提取内容（从第20字节开始，长度为text_len）
            content = unpadded[20:20 + text_len].decode('utf-8')
            
            # 提取AppID（从第20+text_len字节开始到末尾）
            from_appid = unpadded[20 + text_len:].decode('utf-8')
            
            # 5. 校验AppID
            if from_appid != Config.APPID:
                raise Exception(f"AppID校验失败: 期望 {Config.APPID}, 收到 {from_appid}")
            
            return content, from_appid
            
        except Exception as e:
            raise Exception(f"解密失败: {str(e)}")


# ============================================================
# 微信消息签名验证工具
# ============================================================

class WXBizMsgCrypt:
    """
    微信消息加解密封装类
    提供签名验证、加解密功能
    """
    
    def __init__(self, token: str, encoding_aes_key: str, appid: str):
        """
        初始化
        
        Args:
            token: 消息校验Token
            encoding_aes_key: 43位AES Key
            appid: AppID
        """
        self.token = token
        self.encoding_aes_key = encoding_aes_key
        self.appid = appid
        self.prpcrypt = Prpcrypt(encoding_aes_key)
    
    def verify_url(self, msg_signature: str, timestamp: str, nonce: str, echostr: str) -> str:
        """
        验证URL有效性
        
        Args:
            msg_signature: 签名
            timestamp: 时间戳
            nonce: 随机数
            echostr: 加密的随机字符串
            
        Returns:
            解密后的明文字符串
        """
        # 1. 验证签名
        if not self._verify_signature(msg_signature, timestamp, nonce, echostr):
            raise Exception("签名验证失败")
        
        # 2. 解密echostr
        decrypted, appid = self.prpcrypt.decrypt(echostr)
        return decrypted
    
    def decrypt_msg(self, post_data: str, msg_signature: str, timestamp: str, nonce: str) -> str:
        """
        解密POST请求的消息
        
        Args:
            post_data: POST的XML数据
            msg_signature: 签名
            timestamp: 时间戳
            nonce: 随机数
            
        Returns:
            解密后的XML字符串
        """
        # 1. 解析XML获取加密内容
        xml_tree = ET.fromstring(post_data)
        encrypt = xml_tree.find('Encrypt').text
        
        # 2. 验证签名
        if not self._verify_signature(msg_signature, timestamp, nonce, encrypt):
            raise Exception("签名验证失败")
        
        # 3. 解密
        decrypted, appid = self.prpcrypt.decrypt(encrypt)
        return decrypted
    
    def _verify_signature(self, signature: str, timestamp: str, nonce: str, encrypt: str) -> bool:
        """
        验证消息签名
        
        签名生成算法:
        将token、timestamp、nonce、encrypt按字典序排序后拼接
        然后进行SHA1摘要
        """
        # 1. 按字典序排序
        sort_list = sorted([self.token, timestamp, nonce, encrypt])
        
        # 2. 拼接
        sort_str = ''.join(sort_list)
        
        # 3. SHA1摘要
        signature_calculated = hashlib.sha1(sort_str.encode('utf-8')).hexdigest()
        
        # 4. 比对签名
        return signature_calculated == signature


# ============================================================
# Flask 应用
# ============================================================

app = Flask(__name__)


def require_config(f):
    """装饰器：检查配置是否完整"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        missing = []
        if not Config.APPID:
            missing.append('WX_COMPONENT_APPID')
        if not Config.TOKEN:
            missing.append('WX_COMPONENT_TOKEN')
        if not Config.AES_KEY:
            missing.append('WX_COMPONENT_AES_KEY')
        
        if missing:
            print(f"[错误] 缺少配置: {', '.join(missing)}")
            print(f"[提示] 请设置环境变量或在代码中配置")
            return f"配置不完整: {', '.join(missing)}", 500
        return f(*args, **kwargs)
    return decorated_function


def save_ticket(ticket: str):
    """保存票据到文件"""
    try:
        with open(Config.TICKET_FILE, 'w') as f:
            f.write(ticket)
        print(f"[INFO] 票据已保存: {ticket[:20]}...")
    except Exception as e:
        print(f"[错误] 保存票据失败: {e}")


@app.route('/wechat/open/authorize', methods=['GET', 'POST'])
@require_config
def wechat_authorize():
    """
    微信第三方平台授权事件接收URL
    
    GET 请求: 微信服务器验证URL有效性
    POST 请求: 接收授权事件推送（component_verify_ticket等）
    """
    
    # 获取URL参数
    msg_signature = request.args.get('msg_signature', '')
    timestamp = request.args.get('timestamp', '')
    nonce = request.args.get('nonce', '')
    echostr = request.args.get('echostr', '')
    
    # 初始化加解密工具
    try:
        wxcrypt = WXBizMsgCrypt(Config.TOKEN, Config.AES_KEY, Config.APPID)
    except Exception as e:
        print(f"[错误] 初始化加解密工具失败: {e}")
        return "配置错误", 500
    
    # ============================================================
    # GET 请求处理 - 微信服务器验证
    # ============================================================
    if request.method == 'GET':
        print(f"[INFO] 收到微信服务器验证请求")
        print(f"  msg_signature: {msg_signature}")
        print(f"  timestamp: {timestamp}")
        print(f"  nonce: {nonce}")
        
        if not echostr:
            return "参数错误: 缺少echostr", 400
        
        try:
            # 解密echostr
            decrypted_str = wxcrypt.verify_url(msg_signature, timestamp, nonce, echostr)
            print(f"[INFO] URL验证成功，解密后的echostr: {decrypted_str[:50]}...")
            
            # 原样返回解密后的明文
            response = make_response(decrypted_str)
            return response
            
        except Exception as e:
            print(f"[错误] URL验证失败: {e}")
            return f"验证失败: {e}", 403
    
    # ============================================================
    # POST 请求处理 - 接收事件推送
    # ============================================================
    if request.method == 'POST':
        print(f"[INFO] 收到微信事件推送")
        print(f"  msg_signature: {msg_signature}")
        print(f"  timestamp: {timestamp}")
        print(f"  nonce: {nonce}")
        
        try:
            # 获取POST数据
            post_data = request.get_data(as_text=True)
            print(f"[DEBUG] 原始POST数据: {post_data[:200]}...")
            
            # 解密消息
            decrypted_xml = wxcrypt.decrypt_msg(post_data, msg_signature, timestamp, nonce)
            print(f"[INFO] 解密后的消息: {decrypted_xml}")
            
            # 解析XML提取ComponentVerifyTicket
            xml_tree = ET.fromstring(decrypted_xml)
            info_type = xml_tree.find('InfoType').text
            
            print(f"[INFO] 事件类型: {info_type}")
            
            # 根据事件类型处理
            if info_type == 'component_verify_ticket':
                component_verify_ticket = xml_tree.find('ComponentVerifyTicket').text
                if component_verify_ticket:
                    print(f"[重要] ComponentVerifyTicket: {component_verify_ticket}")
                    # 保存票据
                    save_ticket(component_verify_ticket)
                else:
                    print("[警告] ComponentVerifyTicket为空")
                    
            elif info_type == 'authorized':
                # 授权成功事件
                authorizer_appid = xml_tree.find('AuthorizerAppid').text
                print(f"[INFO] 授权成功: {authorizer_appid}")
                
            elif info_type == 'unauthorized':
                # 取消授权事件
                authorizer_appid = xml_tree.find('AuthorizerAppid').text
                print(f"[INFO] 取消授权: {authorizer_appid}")
                
            elif info_type == 'updateauthorized':
                # 更新授权事件
                authorizer_appid = xml_tree.find('AuthorizerAppid').text
                print(f"[INFO] 更新授权: {authorizer_appid}")
                
            else:
                print(f"[INFO] 未知事件类型: {info_type}")
            
            # 返回success表示成功接收
            return 'success'
            
        except Exception as e:
            print(f"[错误] 处理POST请求失败: {e}")
            import traceback
            traceback.print_exc()
            return f"处理失败: {e}", 500


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return {
        'status': 'running',
        'appid': Config.APPID[:10] + '...' if Config.APPID else '未配置',
        'token_configured': bool(Config.TOKEN),
        'aes_key_configured': bool(Config.AES_KEY)
    }


@app.route('/', methods=['GET'])
def index():
    """首页"""
    return {
        'service': '微信第三方平台授权事件接收服务',
        'version': '1.0.0',
        'endpoints': {
            '/wechat/open/authorize': '微信授权事件接收URL',
            '/health': '健康检查'
        },
        'config_status': {
            'appid': bool(Config.APPID),
            'token': bool(Config.TOKEN),
            'aes_key': bool(Config.AES_KEY)
        }
    }


# ============================================================
# 启动服务
# ============================================================

if __name__ == '__main__':
    print("=" * 60)
    print("微信第三方平台授权事件接收服务")
    print("=" * 60)
    
    # 检查配置
    if not all([Config.APPID, Config.TOKEN, Config.AES_KEY]):
        print("\n[警告] 配置不完整！")
        print("请设置以下环境变量:")
        print("  WX_COMPONENT_APPID   - 第三方平台AppID")
        print("  WX_COMPONENT_TOKEN   - 消息校验Token")
        print("  WX_COMPONENT_AES_KEY - 消息加解密Key (43位)")
        print("\n或者直接修改 app.py 中的 Config 类")
    else:
        print(f"[OK] AppID: {Config.APPID}")
        print(f"[OK] Token: 已配置")
        print(f"[OK] AES Key: {Config.AES_KEY[:10]}...")
    
    print("\n启动服务...")
    print("监听地址: 0.0.0.0:5000")
    print("授权回调URL: http://你的域名:5000/wechat/open/authorize")
    print("=" * 60)
    
    # 启动Flask服务
    # 生产环境建议使用 gunicorn: gunicorn -w 4 -b 0.0.0.0:5000 app:app
    app.run(host='0.0.0.0', port=5000, debug=False)
