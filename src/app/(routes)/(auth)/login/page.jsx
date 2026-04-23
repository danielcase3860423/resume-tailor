'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getCookie, setCookie } from 'cookies-next';
import { SyncOutlined } from '@ant-design/icons';
import { useGlobalContext } from '@/context/auth';
import { showToastErrorMsg, showToastInfoMsg, validEmail } from '@/helpers/frontend';
import userService from '@/services/(routes)/users';
import { COOKIE_USER_KEY, ERROR_SUCCESS, Logo } from '@/config/constants';
import { MSG_PROMPT_EMAIL_ADDRESS, MSG_PROMPT_EMAIL_PASSWORD, MSG_PROMPT_LOGIN_COMPLETED } from '@/config/messages';
import {
  ContentWrapper,
  ImgWrapper,
  LoginFormContent,
  FormWrapper,
  LoginBtn,
  AuthLayout,
  AuthBrandBlock,
  AuthTitle,
  AuthBody,
  AuthStatGrid,
  AuthStatCard
} from '@/_components/layout/client/styled';

export default function Login() {
  const { loginUser, setLoginUser } = useGlobalContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const cookie = getCookie(COOKIE_USER_KEY);
    if (cookie) router.push('/');
  }, [router]);

  const validateForm = () => {
    if (!email) {
      showToastErrorMsg(MSG_PROMPT_EMAIL_ADDRESS);
      return false;
    }
    if (!validEmail(email)) {
      return false;
    }
    if (!password) {
      showToastErrorMsg(MSG_PROMPT_EMAIL_PASSWORD);
      return false;
    }
    return true;
  };

  const onLoginClick = async () => {
    if (validateForm()) {
      setLoading(true);
      const data = await userService.login(email, password);
      if (data.result !== ERROR_SUCCESS) {
        showToastErrorMsg(data.msg);
      } else {
        const userData = data.data;
        if (userData.token) {
          const cookiePayload = {
            token: userData.token,
            role: userData.role,
            email: userData.email,
            username: userData.username,
            id: userData._id
          };
          setLoginUser({ isLoggedIn: true, user: cookiePayload });
          setCookie(COOKIE_USER_KEY, JSON.stringify(cookiePayload));
          showToastInfoMsg(MSG_PROMPT_LOGIN_COMPLETED);
          router.push('/');
        }
      }
      setLoading(false);
    }
  };

  return (
    <ContentWrapper>
      <div className='container'>
        <AuthLayout>
          <ImgWrapper>
            <AuthBrandBlock>
              <div className='auth-brand-logo'>
                <Image src={Logo} alt='PeraGreemSolution logo' width={36} height={36} />
                <strong>PeraGreemSolution</strong>
              </div>
              <AuthTitle>Delivery operations for modern software teams.</AuthTitle>
              <AuthBody>
                Sign in to manage candidate profiles, tailored resumes, applies history, phone operations, and sourcing workflows in one
                branded workspace.
              </AuthBody>
            </AuthBrandBlock>
            <AuthStatGrid>
              <AuthStatCard>
                <strong>Profiles</strong>
                <span>Centralized profile management for resume delivery</span>
              </AuthStatCard>
              <AuthStatCard>
                <strong>Applies</strong>
                <span>Track the most recent submissions and targeting history</span>
              </AuthStatCard>
              <AuthStatCard>
                <strong>Jobs</strong>
                <span>Refresh opportunities and keep the funnel current</span>
              </AuthStatCard>
              <AuthStatCard>
                <strong>Calls</strong>
                <span>Keep outreach workflows connected to user roles</span>
              </AuthStatCard>
            </AuthStatGrid>
          </ImgWrapper>

          <LoginFormContent>
            <FormWrapper>
              <form
                style={{ width: '100%' }}
                onSubmit={(e) => {
                  e.preventDefault();
                  onLoginClick();
                }}
              >
                <div>
                  <h5>Welcome back</h5>
                  <p>Sign in to continue delivering resumes, profiles, and client-ready materials with the PeraGreemSolution workflow.</p>
                </div>

                <div className={'form-group '} style={{ paddingBottom: 12 }}>
                  <label htmlFor={'email'}>Email</label>
                  <input
                    type='email'
                    className='form-control'
                    id='email'
                    name='email'
                    autoComplete='email'
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                    }}
                  />
                </div>
                <div className={'form-group '} style={{ paddingBottom: 12 }}>
                  <label htmlFor='password'>Password</label>
                  <input
                    type='password'
                    className='form-control'
                    id='password'
                    name='password'
                    value={password}
                    autoComplete='password'
                    onChange={(e) => {
                      setPassword(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onLoginClick();
                      }
                    }}
                  />
                </div>
                <LoginBtn loading={loading && { icon: <SyncOutlined spin /> }} onClick={onLoginClick}>
                  Login
                </LoginBtn>
              </form>
            </FormWrapper>
          </LoginFormContent>
        </AuthLayout>
      </div>
    </ContentWrapper>
  );
}
